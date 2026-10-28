'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const script=path.join(__dirname,'../scripts/android-emulator-smoke.sh');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/android-emulator-test.yml'),'utf8');
test('script ADB compatible bash, sans syntaxe de boucle tronquee',()=>{
 const result=cp.spawnSync('bash',['-n',script],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,0,result.stderr);
});
test('le runner d emulateur execute une seule commande qui lance le script entier',()=>{
 assert.match(workflow,/script: bash scripts\/android-emulator-smoke\.sh/);
 assert.doesNotMatch(workflow,/script: \|\n\s+for /);
});
test('la capture ecran n est produite qu apres installation et lancement APK',()=>{
 const s=fs.readFileSync(script,'utf8');
 assert.ok(s.indexOf('adb install')>=0);
 assert.ok(s.indexOf('adb shell am start')>s.indexOf('adb install'));
 assert.ok(s.indexOf('adb shell screencap')>s.indexOf('adb shell am start'));
});
