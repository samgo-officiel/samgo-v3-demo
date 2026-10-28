'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validate}=require('../scripts/verify-android-debug.cjs');
const badge="package: name='com.samgo.prototype' versionCode='1'\napplication-label:'SAMGO TEST'\n";
const permissions="uses-permission: name='android.permission.INTERNET'\nuses-permission: name='android.permission.ACCESS_COARSE_LOCATION'\nuses-permission: name='android.permission.ACCESS_FINE_LOCATION'\n";
test('APK de test ne demande pas le GPS de fond',()=>{
 assert.equal(validate(badge,permissions),true);
});
test('APK avec permission GPS de fond rejetée',()=>{
 assert.throws(()=>validate(badge,permissions+"uses-permission: name='android.permission.ACCESS_BACKGROUND_LOCATION'"),/non autorisée/);
});
test('identifiant ou nom Android incohérent rejeté',()=>{
 assert.throws(()=>validate(badge.replace('com.samgo.prototype','com.inconnu'),permissions),/package/);
 assert.throws(()=>validate(badge.replace('SAMGO TEST','APP INCONNUE'),permissions),/nom Android/);
});
