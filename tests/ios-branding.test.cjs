'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {brandIosIcons}=require('../mobile/scripts/configure-ios-icons.cjs');
test('branding iOS n utilise aucun compte développeur et respecte les tailles d icônes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'samgo-ios-icon-'));
 try{
  const catalog=path.join(dir,'AppIcon.appiconset');
  fs.mkdirSync(catalog);
  fs.writeFileSync(path.join(catalog,'Contents.json'),JSON.stringify({
   images:[{filename:'AppIcon-512@2x.png',size:'512x512',scale:'2x'}]
  }));
  const img=path.join(__dirname,'../assets/samgo-app-icon-192.png');
  const sizes=[];
  const count=brandIosIcons(catalog,img,(_src,dest,size)=>{
   sizes.push(size);fs.copyFileSync(img,dest);
  });
  assert.equal(count,1);
  assert.deepEqual(sizes,[1024]);
  assert.deepEqual(fs.readFileSync(path.join(catalog,'AppIcon-512@2x.png')),fs.readFileSync(img));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
