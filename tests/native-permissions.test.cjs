'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {configureAndroid,configureIos}=require('../mobile/scripts/configure-native.cjs');

test('Android declare uniquement position precise et approximative sans arrière-plan',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'samgo-native-'));
 try{
  const file=path.join(dir,'AndroidManifest.xml');
  fs.writeFileSync(file,'<?xml version="1.0"?><manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="SAMGO TEST" /></manifest>');
  assert.equal(configureAndroid(file),true);
  configureAndroid(file);
  const result=fs.readFileSync(file,'utf8');
  for(const permission of ['android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_COARSE_LOCATION'])
   assert.equal(result.split('android:name="'+permission+'"').length-1,1);
  assert.doesNotMatch(result,/ACCESS_BACKGROUND_LOCATION|FOREGROUND_SERVICE_LOCATION/);
  assert.match(result,/<application/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('iOS contient explication GPS lorsque application utilisée seulement',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'samgo-native-'));
 try{
  const file=path.join(dir,'Info.plist');
  fs.writeFileSync(file,'<plist><dict><key>CFBundleName</key><string>SAMGO TEST</string></dict></plist>');
  assert.equal(configureIos(file),true);
  configureIos(file);
  const result=fs.readFileSync(file,'utf8');
  assert.equal(result.split('<key>NSLocationWhenInUseUsageDescription</key>').length-1,1);
  assert.match(result,/SAMGO TEST utilise votre position uniquement/);
  assert.doesNotMatch(result,/NSLocationAlways/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('refuser les permissions GPS de suivi en arrière-plan',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'samgo-native-'));
 try{
  const file=path.join(dir,'AndroidManifest.xml');
  fs.writeFileSync(file,'<manifest><uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" /><application /></manifest>');
  assert.throws(()=>configureAndroid(file),/arrière-plan/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
