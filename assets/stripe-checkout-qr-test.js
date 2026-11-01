/* SAMGO — QR code local pour Stripe Checkout SANDBOX, jamais de paiement réel.
 * Le QR n'est dessiné qu'après création d'une session Stripe TEST authentifiée.
 * Aucun service QR externe : le lien sensible reste dans le navigateur.
 */
(function(){
  'use strict';
  let layer=null;
  let activeUrl=null;
  let focusBefore=null;
  // Payment Link créé sur le compte Stripe SAMGO, exclusivement en mode TEST.
  // Montant fixe 10 € de démonstration : jamais lié à une course réelle.
  const TEST_PAYMENT_LINK='https://buy.stripe.com/test_6oU00l3QT6A26480Eccs800';

  function validateCheckoutUrl(raw){
    if(typeof raw!=='string')throw new Error('Lien Stripe TEST manquant.');
    let url;
    try{url=new URL(raw);}catch(_){throw new Error('Lien Stripe TEST invalide.');}
    if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||
       url.username||url.password||!/^\/(?:c\/)?pay\/cs_test_[A-Za-z0-9]+$/.test(url.pathname)){
      throw new Error('Le QR code accepte uniquement une session Stripe Checkout TEST.');
    }
    return url.href;
  }
  function init(){
    if(layer)return;
    layer=document.createElement('div');
    layer.id='sgStripeQrLayer';
    layer.className='sg-stripe-qr-layer';
    layer.hidden=true;
    layer.innerHTML=[
      '<section class="sg-stripe-qr-card" role="dialog" aria-modal="true" aria-labelledby="sgStripeQrTitle" tabindex="-1">',
      '<span class="sg-stripe-label">STRIPE SANDBOX · AUCUN ARGENT RÉEL</span>',
      '<h2 id="sgStripeQrTitle">Scanner pour payer en TEST</h2>',
      '<p id="sgStripeQrIntro">Scannez ce QR avec un deuxième téléphone pour ouvrir <strong>Stripe Checkout en mode test</strong>. Aucune carte réelle et aucune course réelle.</p>',
      '<div id="sgStripeQrDrawing" class="sg-stripe-qr-drawing" role="img" aria-label="QR code de la session Stripe TEST"></div>',
      '<p id="sgStripeQrNote" class="sg-stripe-qr-note">Utilisez uniquement les cartes de test Stripe. Une image de QR ne prouve pas un paiement : attendez la confirmation du serveur Stripe.</p>',
      '<button type="button" id="sgStripeQrOpen">Ouvrir Stripe TEST sur cet iPhone</button>',
      '<button type="button" class="alt" id="sgStripeQrClose">Fermer le QR code</button>',
      '</section>'
    ].join('');
    document.body.appendChild(layer);
    layer.querySelector('#sgStripeQrClose').addEventListener('click',close);
    layer.querySelector('#sgStripeQrOpen').addEventListener('click',function(){
      if(!activeUrl)return;
      const url=activeUrl;
      close();
      if(!window.sgNativeOpenExternal?.(url))window.location.assign(url);
    });
    layer.addEventListener('click',function(event){if(event.target===layer)close();});
    document.addEventListener('keydown',function(event){
      if(!layer||layer.hidden)return;
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key!=='Tab')return;
      const items=Array.from(layer.querySelectorAll('button:not([disabled])'));
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
  }
  function draw(raw,demo=false){
    // Ne jamais accepter un lien de paiement de production dans un QR TEST.
    const url=demo
      ? (raw===TEST_PAYMENT_LINK ? TEST_PAYMENT_LINK :
         (()=>{throw new Error('Lien Stripe TEST non autorisé.');})())
      : validateCheckoutUrl(raw);
    if(typeof window.qrcode!=='function')throw new Error('Création du QR indisponible. Actualisez SAMGO.');
    // Création entièrement locale, aucune API ni image QR hébergée ailleurs.
    const qr=window.qrcode(0,'M');
    qr.addData(url);
    qr.make();
    const svg=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
    init();
    layer.querySelector('#sgStripeQrTitle').textContent=demo?
      '💳 QR paiement — essai 10 €':'Scanner pour payer en TEST';
    layer.querySelector('#sgStripeQrIntro').textContent=demo?
      'Paiement de démonstration de 10 € dans Stripe TEST, sans compte SAMGO. Scannez avec un deuxième téléphone ou ouvrez Stripe sur cet iPhone. Aucun argent réel et aucune course réservée.':
      'Scannez ce QR avec un deuxième téléphone pour ouvrir Stripe Checkout en mode test. Aucune course réelle.';
    layer.querySelector('#sgStripeQrNote').textContent=demo?
      'Attention : ce QR à 10 € est un essai indépendant des réservations SAMGO. Utilisez seulement les cartes de TEST Stripe. Un retour depuis Stripe ne confirme jamais une course ni un paiement SAMGO.':
      'Utilisez uniquement les cartes de test Stripe. Un QR ou un retour ne prouve pas que Stripe a confirmé le paiement ; seule la confirmation serveur signée est valable.';
    layer.querySelector('#sgStripeQrDrawing').innerHTML=svg;
    focusBefore=document.activeElement;
    activeUrl=url;
    layer.hidden=false;
    layer.querySelector('#sgStripeQrClose').focus();
  }
  function show(raw){return draw(raw,false);}
  function showDemo(){return draw(TEST_PAYMENT_LINK,true);}
  function close(){
    activeUrl=null;
    if(!layer)return;
    layer.hidden=true;
    layer.querySelector('#sgStripeQrDrawing').replaceChildren();
    if(focusBefore&&typeof focusBefore.focus==='function')focusBefore.focus();
    focusBefore=null;
  }
  window.sgStripeQrTest={show,showDemo,close};
})();