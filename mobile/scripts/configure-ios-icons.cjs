'use strict';
/* SAMGO TEST — adapter le logo existant à l'AppIcon du simulateur iOS.
 * N'active pas la signature ni la distribution Apple.
 * L'image 192px sera remplacée par une source haute résolution avant App Store.
 */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function brandIosIcons(catalog=path.join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset'),
 source=path.join(root,'www/assets/samgo-app-icon-192.png'),
 resize=(from,to,size)=>cp.execFileSync('sips',['-z',String(size),String(size),from,'--out',to],{stdio:'pipe'})){
 if(!fs.existsSync(catalog)||!fs.existsSync(source))return 0;
 const meta=JSON.parse(fs.readFileSync(path.join(catalog,'Contents.json'),'utf8'));
 let count=0;
 for(const item of meta.images||[]){
  if(!item.filename||!/^[-\w.]+\.png$/.test(item.filename))continue;
  const requested=Number(String(item.size||'1024x1024').split('x')[0]);
  const scale=Number(String(item.scale||'1x').replace('x',''))||1;
  const pixels=Math.round(requested*scale);
  if(!Number.isSafeInteger(pixels)||pixels<16||pixels>4096)throw Error('Taille icone iOS invalide');
  const dest=path.join(catalog,item.filename);
  resize(source,dest,pixels);
  if(!fs.existsSync(dest)||fs.statSync(dest).size===0)throw Error('Logo iOS non genere: '+item.filename);
  count++;
 }
 if(!count)throw Error('Aucune ressource icone iOS trouvée');
 return count;
}
if(require.main===module){
 const n=brandIosIcons();
 if(!n)throw Error('Projet iOS ou logo SAMGO absent');
 console.log('Icônes iOS SAMGO TEST générées :',n);
}
module.exports={brandIosIcons};
