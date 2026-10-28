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
   {path:'?app=trips',route:'trips',image:'courses-test-mobile.png'}
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
   await page.screenshot({path:path.join(out,spec.image),fullPage:false});
   console.log('SAMGO mobile OK : '+spec.route+' ['+result.viewport+' px]');
   await page.close();
  }
 }finally{await browser.close();}
}
main().catch(e=>{console.error('Essai navigateur SAMGO TEST échoué :',e.message);process.exitCode=1;});
