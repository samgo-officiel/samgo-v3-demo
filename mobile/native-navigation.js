/* SAMGO TEST — comportements exclusifs aux applications natives.
 * Aucun GPS automatique, aucune collecte, aucun paiement reel.
 */
(function(){
 'use strict';
 let registered=false;
 function isNative(){
  return window.Capacitor?.isNativePlatform?.()===true;
 }
 function openExternal(rawUrl){
  if(!isNative())return false;
  const browser=window.Capacitor?.Plugins?.Browser;
  if(!browser?.open)return false;
  try{
   // Rejeter les caractères de contrôle que URL() pourrait supprimer silencieusement.
   if(typeof rawUrl!=='string'||rawUrl!==rawUrl.trim()||/[\u0000-\u001F\u007F]/.test(rawUrl))return false;
   const parsed=new URL(rawUrl,window.location?.href||'http://localhost/index.html');
   // Ne jamais ouvrir de schéma arbitraire depuis une WebView.
   if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password)return false;
   Promise.resolve(browser.open({url:parsed.href})).catch(()=>{
    // Le navigateur externe est facultatif : ne pas déplacer la WebView
    // vers un site tiers si une ouverture a échoué.
    const status=document.getElementById('sgNativeLinkStatus');
    if(status)status.textContent='Impossible d’ouvrir ce lien HTTPS. Réessayez plus tard.';
   });
   return true;
  }catch(_){return false;}
 }
 function onLinkClick(event){
  if(event.defaultPrevented)return;
  // Un clic sur un noeud texte doit aussi être intercepté (WebView native).
  const element=event.target?.nodeType===3?event.target.parentElement:event.target;
  const anchor=element?.closest?.('a[href]');
  if(!anchor)return;
  const href=anchor.getAttribute('href');
  if(!href||href.startsWith('#'))return;
  // Les sauts de ligne et caractères invisibles ne doivent pas être normalisés
  // en une destination différente par URL() ou par le navigateur natif.
  if(href!==href.trim()||/[\u0000-\u001F\u007F]/.test(href)){
   event.preventDefault();
   const status=document.getElementById('sgNativeLinkStatus');
   if(status)status.textContent='Lien invalide bloqué. Vérifiez l’adresse.';
   return;
  }
  let target;
  try{target=new URL(href,window.location.href);}catch(_){
   // Un href malformé ne doit jamais être confié à la WebView native.
   event.preventDefault();
   const status=document.getElementById('sgNativeLinkStatus');
   if(status)status.textContent='Lien invalide bloqué. Vérifiez l’adresse.';
   return;
  }
  // Une URL avec identifiants intégrés reste interdite même sur notre origine.
  if(target.origin===window.location.origin&&!target.username&&!target.password)return;
  // Téléphone et messagerie : laisser le système gérer ces liens.
  if(target.protocol==='tel:'||target.protocol==='mailto:')return;
  // En application native, aucun lien internet externe ne doit remplacer
  // la page SAMGO dans la WebView (session, historique, retour utilisateur).
  event.preventDefault();
  // Une URL HTTPS avec identifiants est dangereuse même si le schéma est valide.
  // Afficher la vraie raison du refus au lieu d'accuser le navigateur natif.
  const hasCredentials=Boolean(target.username||target.password);
  if(target.protocol==='https:'&&!hasCredentials&&openExternal(target.href))return;
  const status=document.getElementById('sgNativeLinkStatus');
  if(status)status.textContent=hasCredentials
   ?'Lien externe bloqué : identifiants intégrés dans l’adresse interdits.'
   :target.protocol==='https:'
    ?'Le navigateur externe est indisponible. Le lien n’a pas été ouvert dans SAMGO.'
    :'Lien externe non sécurisé bloqué. Seuls les liens HTTPS sont autorisés.';
 }
 function install(){
  if(registered||!isNative())return;
  const capacitor=window.Capacitor;
  const app=capacitor.Plugins?.App;
  // La protection des liens est obligatoire meme si le plugin App est absent.
  // Sans cela, une WebView native pourrait naviguer vers un site tiers.
  registered=true;
  document.addEventListener('click',onLinkClick,true);
  if(!app?.addListener)return;
  try{
   const result=app.addListener('backButton',()=>{
    // Le QR Stripe TEST est une fenêtre prioritaire : Retour ferme le QR,
    // sans modifier l'écran derrière ni laisser un lien de paiement affiché.
    const qr=window.sgStripeQrTest;
    if(qr?.isOpen?.()){
     qr.close?.();
     return;
    }
    // La messagerie plein écran doit traiter Retour avant les menus et les routes.
    // Sinon Android change d'écran derrière une conversation toujours ouverte.
    const chat=window.sgChatPage;
    if(chat?.isOpen?.()){
     chat.back?.();
     return;
    }
    const menu=document.getElementById('sg-menu-panel');
    if(menu&&!menu.hasAttribute('hidden')){
     menu.setAttribute('hidden','');
     document.querySelector('.sg-menu-trigger')?.setAttribute('aria-expanded','false');
     return;
    }
    if(!document.body.classList.contains('sg-home-active')){
     if(typeof window.sgGo==='function')window.sgGo('home');
     else if(typeof sgGo==='function')sgGo('home');
     return;
    }
    if(typeof app.minimizeApp==='function')app.minimizeApp();
   });
   Promise.resolve(result).catch(()=>{/* conserver la protection des liens */});
   // Sur iPhone, fermer SafariViewController ne produit pas toujours
   // un événement App.resume : écouter également Browser.browserFinished.
   // Aucun appel GPS ici, et aucun statut n'est pris pour une preuve de paiement.
   let lastRefresh=0;
   const refreshStatuses=()=>{
    const now=Date.now();
    if(now-lastRefresh<1200)return;
    lastRefresh=now;
    window.sgStripeSandbox?.refresh?.();
    window.sgDemand?.refreshClient?.();
   };
   const resume=app.addListener('resume',refreshStatuses);
   Promise.resolve(resume).catch(()=>{});
   const browser=capacitor.Plugins?.Browser;
   if(browser?.addListener){
    try{
     Promise.resolve(browser.addListener('browserFinished',refreshStatuses)).catch(()=>{});
    }catch(_){/* facultatif sur anciens conteneurs */}
   }
  }catch(_){/* conserver la protection des liens meme sans Retour natif */}
 }
 window.sgNativeOpenExternal=openExternal;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
