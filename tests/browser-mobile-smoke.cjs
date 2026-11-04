'use strict';
/* Essai visuel public de SAMGO TEST, sans login, GPS, paiement ni données privées.
 * Dépendance Playwright installée seulement dans le workflow de diagnostic.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const out=path.resolve(process.env.SAMGO_SCREENSHOT_DIR||'/tmp/samgo-screenshots');
fs.mkdirSync(out,{recursive:true});
const root=process.env.SAMGO_BROWSER_URL||'http://127.0.0.1:8765/';
async function main(){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({
  viewport:{width:390,height:844},
  deviceScaleFactor:1,
  isMobile:true,
  hasTouch:true,
  locale:'fr-FR'
 });
 try{
  const cases=[
   {path:'',route:'home',image:'accueil-mobile.png'},
   {path:'?app=book',route:'book',image:'reservation-test-mobile.png'},
   {path:'?app=driver',route:'driver',image:'chauffeur-test-mobile.png'},
   {path:'?app=trips',route:'trips',image:'courses-test-mobile.png'},
   {path:'?app=account',route:'account',image:'compte-test-mobile.png'}
  ];
  for(const spec of cases){
   const page=await context.newPage();
   await page.goto(root+spec.path,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(
    route=>route==='home'?document.body.classList.contains('sg-home-active'):
     document.body.classList.contains('sg-route-'+route),
    spec.route,{timeout:10000}
   );
   const result=await page.evaluate(()=>({
    title:document.title,
    width:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,
    gpsStatus:document.getElementById('sgGeoStatus')?.textContent||'',
    pages:!!document.getElementById('sgNearbyMap')&&!!document.getElementById('authPanel'),
    visible:!!document.querySelector('.sg-nav')
   }));
   assert.match(result.title,/SAMGO/i);
   assert.equal(result.pages,true,'Les écrans client et chauffeur doivent exister');
   assert.ok(result.width<=result.viewport+32,
    'Débordement horizontal sur '+spec.route+': '+result.width+' pour '+result.viewport+' px');
   // Aucun raccourci d'application ne doit solliciter le GPS spontanément.
   assert.doesNotMatch(result.gpsStatus,/GPS actif|précision annoncée/i);
   // Vérifier les écrans interactifs sans compte ni transaction Stripe.
   if(spec.route==='book'){
    await page.locator('#sgStripeQrNoAccountButton').click();
    const qr=page.locator('#sgStripeQrLayer');
    await qr.waitFor({state:'visible'});
    assert.match(await page.locator('#sgStripeQrTitle').innerText(),/10 €/);
    await page.locator('#sgStripeQrClose').click();
    await qr.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.sgStripeQrTest.isOpen()),false);
    // Aucune ouverture du checkout : ce test ne dessine qu'un QR local.
   }
   // Vérifier les nouveaux parcours V2 sans connexion ni autorisation GPS.
   if(spec.route==='trips'){
    await page.locator('#sgJourneyCheck').click();
    const journey=await page.locator('#sgJourneyStatus').innerText();
    assert.match(journey,/pas connecté|Connectez-vous/,
      'Le diagnostic doit orienter vers la connexion sans annoncer de fausse publication');
    const chat=await page.locator('#sgChatClientStatus').innerText();
    assert.match(chat,/TEST|connexion|convers|simul|démonstration/i);
    assert.equal(await page.evaluate(()=>window.sgChatPage.open('client')),true);
    await page.locator('#sgFullChatPage').waitFor({state:'visible'});
    assert.match(await page.locator('#sgFullChatStatus').innerText(),/Connectez-vous/i);
    await page.locator('#sgFullChatBack').click();
    await page.locator('#sgFullChatPage').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.sgChatPage.isOpen()),false);
   }
   if(spec.route==='account'){
    await page.locator('#signinModeBtn').click();
    assert.match(await page.locator('#accountTitle').innerText(),/Connexion SAMGO/i);
    assert.match(await page.locator('#authEmailHelp').innerText(),/même compte SAMGO/i);
    await page.locator('#signupModeBtn').click();
    assert.match(await page.locator('#accountTitle').innerText(),/Créer mon compte SAMGO/i);
   }
   await page.screenshot({path:path.join(out,spec.image),fullPage:false});
   console.log('SAMGO mobile OK : '+spec.route+' ['+result.viewport+' px]');
   await page.close();
  }
  // Un écran iPhone/Android plus étroit et le mode paysage révèlent des
  // débordements que le seul viewport 390px ne détecte pas.
  for(const size of [
   {width:320,height:680,label:'petit-320'},
   {width:844,height:390,label:'paysage-844'}
  ]){
   const narrow=await browser.newContext({
    viewport:{width:size.width,height:size.height},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'
   });
   try{
    for(const route of ['home','book','account']){
     const page=await narrow.newPage();
     await page.goto(root+(route==='home'?'':'?app='+route),
      {waitUntil:'domcontentloaded',timeout:25000});
     await page.waitForFunction(expected=>expected==='home'?
       document.body.classList.contains('sg-home-active'):
       document.body.classList.contains('sg-route-'+expected),route,{timeout:10000});
     const result=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth,
      screen:window.innerWidth
     }));
     assert.ok(result.width<=result.viewport+32,
      'Débordement sur '+size.label+' / '+route+': '+result.width+' px / '+result.viewport+' px');
     await page.screenshot({path:path.join(out,route+'-'+size.label+'.png'),fullPage:false});
     console.log('SAMGO responsive OK : '+route+' / '+size.label);
     await page.close();
    }
   }finally{await narrow.close();}
  }
 }finally{await browser.close();}
}
main().catch(e=>{console.error('Essai navigateur SAMGO TEST échoué :',e.message);process.exitCode=1;});
