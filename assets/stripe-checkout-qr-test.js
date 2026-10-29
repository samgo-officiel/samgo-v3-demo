/* SAMGO — QR code local pour Stripe Checkout SANDBOX, jamais de paiement réel.
 * Le QR n'est dessiné qu'après création d'une session Stripe TEST authentifiée.
 * Aucun service QR externe : le lien sensible reste dans le navigateur.
 */
(function(){
  'use strict';
  let layer=null;
  let activeUrl=null;
  let focusBefore=null;

  function validateCheckoutUrl(raw){
    if(typeof raw!=='string')throw new Error('Lien Stripe TEST manquant.');
    let url;
    try{url=new URL(raw);}catch(_){throw new Error('Lien Stripe TEST invalide.');}
    if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||
       url.username||url.password||!/\/cs_test_[A-Za-z0-9]+/.test(url.pathname)){
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
      '<p>Scannez ce QR avec un deuxième téléphone pour ouvrir <strong>Stripe Checkout en mode test</strong>. Aucune carte réelle et aucune course réelle.</p>',
      '<div id="sgStripeQrDrawing" class="sg-stripe-qr-drawing" role="img" aria-label="QR code de la session Stripe TEST"></div>',
      '<p class="sg-stripe-qr-note">Utilisez uniquement les cartes de test Stripe. Une image de QR ne prouve pas un paiement : attendez la confirmation du serveur Stripe.</p>',
      '<button type="button" id="sgStripeQrOpen">Ouvrir Stripe TEST sur ce téléphone</button>',
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
  function show(raw){
    const url=validateCheckoutUrl(raw);
    if(typeof window.qrcode!=='function')throw new Error('Création du QR indisponible. Actualisez SAMGO.');
    // Création entièrement locale, aucune API ni image QR hébergée ailleurs.
    const qr=window.qrcode(0,'M');
    qr.addData(url);
    qr.make();
    const svg=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
    init();
    layer.querySelector('#sgStripeQrDrawing').innerHTML=svg;
    focusBefore=document.activeElement;
    activeUrl=url;
    layer.hidden=false;
    layer.querySelector('#sgStripeQrClose').focus();
  }
  function close(){
    activeUrl=null;
    if(!layer)return;
    layer.hidden=true;
    layer.querySelector('#sgStripeQrDrawing').replaceChildren();
    if(focusBefore&&typeof focusBefore.focus==='function')focusBefore.focus();
    focusBefore=null;
  }
  window.sgStripeQrTest={show,close};
})();