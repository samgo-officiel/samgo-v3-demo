'use strict';
/* SAMGO TEST — permissions minimales des projets natifs générés.
 * Appels GPS uniquement après demande explicite depuis les écrans de test.
 * Ne demande aucune localisation en arrière-plan.
 */
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const android=path.join(mobile,'android/app/src/main/AndroidManifest.xml');
const ios=path.join(mobile,'ios/App/App/Info.plist');
const locationExplanation='SAMGO TEST utilise votre position uniquement lorsque vous demandez à voir des annonces fictives à proximité ou à publier une simulation. Aucun suivi en arrière-plan.';
function configureAndroid(file=android){
 if(!fs.existsSync(file))return false;
 let xml=fs.readFileSync(file,'utf8');
 if(!/<manifest\b/.test(xml)||!/<application\b/.test(xml))throw Error('Manifeste Android inattendu');
 for(const permission of ['android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION']){
  if(!xml.includes('android:name="'+permission+'"')){
   xml=xml.replace(/(<application\b)/,
    '    <uses-permission android:name="'+permission+'" />\n    $1');
  }
 }
 if(/ACCESS_BACKGROUND_LOCATION|FOREGROUND_SERVICE_LOCATION/.test(xml))
  throw Error('Permission localisation en arrière-plan interdite pour SAMGO TEST');
 fs.writeFileSync(file,xml);
 return true;
}
function configureIos(file=ios){
 if(!fs.existsSync(file))return false;
 let plist=fs.readFileSync(file,'utf8');
 if(!plist.includes('<dict>'))throw Error('Info.plist iOS inattendu');
 if(!plist.includes('<key>NSLocationWhenInUseUsageDescription</key>')){
  plist=plist.replace('<dict>','<dict>\n\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>'+locationExplanation+'</string>');
 }
 // Capacitor Geolocation 8 requiert aussi cette CLE DE TEXTE iOS
 // même si SAMGO n'appelle jamais requestAlwaysAuthorization ni watchPosition.
 // Ce libellé ne demande aucun droit de localisation en arrière-plan.
 if(!plist.includes('<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>')){
  plist=plist.replace('<dict>',
   '<dict>\n\t<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>\n\t<string>'+locationExplanation+'</string>');
 }
 if(plist.includes('<key>NSLocationAlwaysUsageDescription</key>'))
  throw Error('Permission Always legacy non autorisée dans SAMGO TEST');
 fs.writeFileSync(file,plist);
 return true;
}
function brandAndroidIcons(resources=path.join(mobile,'android/app/src/main/res'),
 source=path.join(mobile,'www/assets/samgo-app-icon-192.png')){
 if(!fs.existsSync(resources)||!fs.existsSync(source))return 0;
 let count=0;
 for(const dir of fs.readdirSync(resources).filter(x=>x.startsWith('mipmap-'))){
  const full=path.join(resources,dir);
  if(!fs.statSync(full).isDirectory())continue;
  for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']){
   const target=path.join(full,name);
   if(fs.existsSync(target)){
    fs.copyFileSync(source,target);
    count++;
   }
  }
 }
 return count;
}
if(require.main===module){
 const done={android:configureAndroid(),ios:configureIos()};
 if(!done.android&&!done.ios)throw Error('Aucun projet natif généré trouvé. Exécuter npx cap add android / ios.');
 const icons=done.android?brandAndroidIcons():0;
 console.log('Permissions GPS SAMGO TEST configurées :',JSON.stringify(done));
 console.log('Icônes Android SAMGO TEST actualisées :',icons);
}
module.exports={configureAndroid,configureIos,brandAndroidIcons,locationExplanation};
