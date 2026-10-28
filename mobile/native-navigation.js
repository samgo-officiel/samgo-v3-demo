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
   const parsed=new URL(rawUrl,window.location?.href||'http://localhost/index.html');
   // Ne jamais ouvrir de schéma arbitraire depuis une WebView.
   if(parsed.protocol!=='https:')return false;
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
  const anchor=event.target?.closest?.('a[href]');
  if(!anchor)return;
  const href=anchor.getAttribute('href');
  if(!href||href.startsWith('#'))return;
  let target;
  try{target=new URL(href,window.location.href);}catch(_){return;}
  if(target.origin===window.location.origin)return;
  if(openExternal(target.href))event.preventDefault();
 }
 function install(){
  if(registered||!isNative())return;
  const capacitor=window.Capacitor;
  const app=capacitor.Plugins?.App;
  if(!app?.addListener)return;
  registered=true;
  // Toutes les ressources SAMGO restent dans la WebView ; seules les URL
  // HTTPS externes explicitement ouvertes par l'utilisateur en sortent.
  document.addEventListener('click',onLinkClick,true);
  try{
   const result=app.addListener('backButton',()=>{
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
   Promise.resolve(result).catch(()=>{registered=false;});
   // Au retour d'un navigateur externe (e-mail ou Stripe SANDBOX),
   // relire les statuts du serveur ; le simple retour n'est jamais
   // une preuve de paiement ni d'approbation chauffeur.
   const resume=app.addListener('resume',()=>{
    window.sgStripeSandbox?.refresh?.();
    window.sgDemand?.refreshClient?.();
   });
   Promise.resolve(resume).catch(()=>{});
  }catch(_){registered=false;}
 }
 window.sgNativeOpenExternal=openExternal;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
