'use strict';
/* SAMGO TEST : contrôle de l'APK Android compilée sur GitHub.
 * Vérifie le manifeste réellement présent dans le binaire ; ne signe
 * ni ne distribue aucun APK.
 */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
function validate(badging,permissions){
 if(!/package:\s+name='com\.samgo\.prototype'/.test(badging))
  throw Error('Le package Android ne correspond pas au prototype SAMGO');
 if(!/application-label:\s*'SAMGO TEST'/.test(badging))
  throw Error('Le nom Android SAMGO TEST est absent');
 for(const perm of ['android.permission.INTERNET','android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION']){
  if(!permissions.includes(perm))throw Error('Permission Android absente : '+perm);
 }
 for(const forbidden of ['android.permission.ACCESS_BACKGROUND_LOCATION','android.permission.READ_SMS','android.permission.RECORD_AUDIO']){
  if(permissions.includes(forbidden))throw Error('Permission Android non autorisée : '+forbidden);
 }
 return true;
}
function aaptPath(sdk){
 const dir=path.join(sdk,'build-tools');
 if(!fs.existsSync(dir))throw Error('Android build-tools manquants');
 const dirs=fs.readdirSync(dir).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
 for(const v of dirs){
  const exe=path.join(dir,v,'aapt');
  if(fs.existsSync(exe))return exe;
 }
 throw Error('Outil aapt introuvable dans Android SDK');
}
function inspect(apk){
 if(!fs.existsSync(apk)||fs.statSync(apk).size<10000)throw Error('APK Android absente ou vide');
 const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
 if(!sdk)throw Error('ANDROID_HOME manquant');
 const tool=aaptPath(sdk);
 const badging=cp.execFileSync(tool,['dump','badging',apk],{encoding:'utf8',maxBuffer:1024*1024});
 const permissions=cp.execFileSync(tool,['dump','permissions',apk],{encoding:'utf8',maxBuffer:1024*1024});
 return validate(badging,permissions);
}
if(require.main===module){
 const apk=process.argv[2];
 if(!apk)throw Error('Préciser le chemin du fichier debug.apk');
 inspect(path.resolve(apk));
 console.log('SAMGO Android DEBUG : package, nom et permissions vérifiés.');
}
module.exports={validate,inspect};
