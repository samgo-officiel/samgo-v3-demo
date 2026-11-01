'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('assets/stripe-checkout-qr-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const trusted='https://buy.stripe.com/test_6oU00l3QT6A26480Eccs800';
function boot(){
 const fields=new Map();
 const calls={urls:[],qr:0,created:0,redirects:[]};
 function element(name){
  if(!fields.has(name))fields.set(name,{
   textContent:'',innerHTML:'',hidden:false,disabled:false,focus(){},replaceChildren(){this.innerHTML='';},
   addEventListener(type,fn){this['on_'+type]=fn;},
   querySelector(sel){return element(sel);},querySelectorAll(){return []}
  });
  return fields.get(name);
 }
 const root=element('root');
 const document={
  body:{appendChild(node){calls.created++;calls.layer=node;}},
  activeElement:{focus(){}},
  createElement(){return root;},
  addEventListener(){}
 };
 const window={
  qrcode(){calls.qr++;return {
    addData(url){calls.urls.push(url);},
    make(){},
    createSvgTag(){return '<svg role="img" />';}
  };},
  location:{assign(url){calls.redirects.push(url);}}
 };
 vm.runInNewContext(script,{window,document,URL,Error,Array,String});
 return {api:window.sgStripeQrTest,fields,calls};
}
test('le lien TEST QR est bien celui créé sur Stripe, pas une URL de production',()=>{
 assert.match(script,/https:\/\/buy\.stripe\.com\/test_/);
 assert.doesNotMatch(script,/https:\/\/buy\.stripe\.com\/(?!test_)[a-zA-Z0-9]/);
});
test('aucun QR, paiement ou redirection au simple chargement de la page',()=>{
 const x=boot();
 assert.equal(x.calls.created,0);
 assert.equal(x.calls.qr,0);
 assert.equal(x.calls.redirects.length,0);
});
test('ouvrir le QR paiement 10 € TEST sans compte, puis fermer',()=>{
 const x=boot();
 x.api.showDemo();
 assert.equal(x.calls.created,1);
 assert.equal(x.calls.qr,1);
 assert.deepEqual(x.calls.urls,[trusted]);
 assert.match(x.fields.get('#sgStripeQrTitle').textContent,/10 €/);
 assert.match(x.fields.get('#sgStripeQrIntro').textContent,/Aucun argent réel/);
 assert.match(x.fields.get('#sgStripeQrNote').textContent,/indépendant/);
 assert.equal(x.calls.layer.hidden,false);
 x.api.close();
 assert.equal(x.calls.layer.hidden,true);
 assert.equal(x.fields.get('#sgStripeQrDrawing').innerHTML,'');
});
test('QR Stripe Checkout existant garde ses contrôles cs_test uniquement',()=>{
 const x=boot();
 x.api.show('https://checkout.stripe.com/c/pay/cs_test_ABCdef123');
 assert.deepEqual(x.calls.urls,['https://checkout.stripe.com/c/pay/cs_test_ABCdef123']);
 assert.match(x.fields.get('#sgStripeQrTitle').textContent,/Scanner/);
 assert.throws(()=>x.api.show('https://checkout.stripe.com/c/pay/cs_live_ABCdef123'),/uniquement/);
 assert.throws(()=>x.api.show('https://evil.example/c/pay/cs_test_ABCdef123'),/uniquement/);
 assert.throws(()=>x.api.show('http://checkout.stripe.com/c/pay/cs_test_ABCdef123'),/uniquement/);
});
test('l’écran Réserver montre le prix fixe et l’absence de course liée',()=>{
 assert.match(html,/id="sgStripeQrNoAccountTest"/);
 assert.match(html,/id="sgStripeQrNoAccountButton"/);
 assert.match(html,/onclick="window\.sgStripeQrTest\.showDemo\(\)"/);
 assert.match(html,/10,00 € fictifs/);
 assert.match(html,/aucune course réservée/i);
 assert.match(html,/stripe-checkout-qr-test\.js\?v=20261101-sandbox-qr10/);
 assert.match(html,/4242 4242 4242 4242/);
});
