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
 if(plist.includes('<key>NSLocationAlwaysUsageDescription</key>')||
    plist.includes('<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>'))
  throw Error('Ne pas activer le GPS iOS en arrière-plan dans SAMGO TEST');
 fs.writeFileSync(file,plist);
 return true;
}
if(require.main===module){
 const done={android:configureAndroid(),ios:configureIos()};
 if(!done.android&&!done.ios)throw Error('Aucun projet natif généré trouvé. Exécuter npx cap add android / ios.');
 console.log('Permissions GPS SAMGO TEST configurées :',JSON.stringify(done));
}
module.exports={configureAndroid,configureIos,locationExplanation};
