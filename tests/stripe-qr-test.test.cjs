'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const vendor=require('../assets/vendor/qrcode-generator.js');
const qrScript=fs.readFileSync(path.join(__dirname,'../assets/stripe-checkout-qr-test.js'),'utf8');
const stripeScript=fs.readFileSync(path.join(__dirname,'../assets/stripe-sandbox-connexion.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const url='https://checkout.stripe.com/c/pay/cs_test_1234567890abcdefgh#test123';

function setup(){
 const elements=new Map();
 const doc={activeElement:{focus(){}},body:{appendChild(n){elements.set('layer',n);}},addEventListener(){}};
 function button(){
  const handlers={};
  return {addEventListener(t,f){handlers[t]=f;},focus(){doc.activeElement=this;},fire(t='click'){handlers[t]?.({target:this});}};
 }
 const close=button(),open=button();
 const drawing={innerHTML:'',replaceChildren(){this.innerHTML='';}};
 const title={textContent:''},intro={textContent:''},note={textContent:''};
 const layer={
  hidden:true,innerHTML:'',addEventListener(){},querySelector(s){
   return {'#sgStripeQrClose':close,'#sgStripeQrOpen':open,'#sgStripeQrDrawing':drawing,
    '#sgStripeQrTitle':title,'#sgStripeQrIntro':intro,'#sgStripeQrNote':note}[s];
  },querySelectorAll(){return [open,close];}
 };
 doc.createElement=()=>layer;
 const win={qrcode:vendor,location:{assign(){}},sgNativeOpenExternal:()=>true};
 vm.runInNewContext(qrScript,{window:win,document:doc,URL,Error,Array}, {timeout:1000});
 return {win,layer,open,close,drawing};
}

test('Le QR encode localement un lien Stripe TEST valide en SVG scannable',()=>{
 const qr=vendor(0,'M');
 qr.addData(url);
 qr.make();
 const svg=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
 assert.match(svg,/^<svg /);
 assert.match(svg,/<path /);
 assert.ok(qr.getModuleCount()>=21);
});

test('Le QR refuse les URLs externes, en HTTP et les paiements live',()=>{
 const {win,layer}=setup();
 for(const invalid of [
  'http://checkout.stripe.com/c/pay/cs_test_abcdefgh',
  'https://checkout.stripe.com.evil.test/c/pay/cs_test_abcdef',
  'https://checkout.stripe.com/c/pay/cs_live_abc123',
  'https://evil.test/pay/cs_test_123456',
  'javascript:alert(1)'
 ]){
  assert.throws(()=>win.sgStripeQrTest.show(invalid),/Stripe|Lien/);
  assert.equal(layer.hidden,true);
 }
});

test('Afficher le QR exige Stripe TEST, puis fermer efface la session visible',()=>{
 const {win,layer,drawing}=setup();
 win.sgStripeQrTest.show(url);
 assert.equal(layer.hidden,false);
 assert.match(drawing.innerHTML,/<svg /);
 win.sgStripeQrTest.close();
 assert.equal(layer.hidden,true);
 assert.equal(drawing.innerHTML,'');
});

test('Le parcours SAMGO ouvre le QR local uniquement apres la verification serveur',()=>{
 assert.match(stripeScript,/await call\('checkout',\{choix_id:id\}\)/);
 assert.match(stripeScript,/data\.sandbox/);
 assert.match(stripeScript,/sgStripeQrTest\.show\(data\.url\)/);
 assert.match(stripeScript,/sgStripeQrTest\.close\(\)/);
 assert.ok(html.indexOf('assets/vendor/qrcode-generator.js')<
   html.indexOf('assets/stripe-checkout-qr-test.js'));
 assert.ok(html.indexOf('assets/stripe-checkout-qr-test.js')<
   html.indexOf('assets/stripe-sandbox-connexion.js'));
 assert.match(html,/statut,checkout_url,modifie_le/);
 const driverUI=fs.readFileSync(path.join(__dirname,'../assets/avis-chauffeurs-test.js'),'utf8');
 assert.match(driverUI,/Montrer le QR TEST au client/);
 assert.match(driverUI,/payment\.statut==='checkout_ouvert'/);
 assert.match(driverUI,/selection\.statut==='choisi_test' && payment/);
 assert.match(driverUI,/sgStripeQrTest\.show\(payment\.checkout_url\)/);
 assert.doesNotMatch(qrScript,/api\.qrserver|quickchart|chart\.googleapis|fetch\(/);
});

test('QR Stripe TEST rejette les chemins trompeurs malgré le bon domaine',()=>{
 const {win,layer}=setup();
 for(const invalid of [
  'https://checkout.stripe.com/redirect/cs_test_abcd1234',
  'https://checkout.stripe.com/c/pay/cs_test_abcd1234/extra',
  'https://checkout.stripe.com/c/pay/cs_test_abcd1234.evil',
  'https://checkout.stripe.com/pay/cs_live_abcd1234'
 ]){
  assert.throws(()=>win.sgStripeQrTest.show(invalid),/Stripe/);
  assert.equal(layer.hidden,true);
 }
});
