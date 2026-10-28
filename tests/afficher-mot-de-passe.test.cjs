'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/afficher-mot-de-passe-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function start(){
 const field={type:'password',value:'UnMotDePasseFictif123'};
 const button={textContent:'Afficher le mot de passe',attrs:{},
  setAttribute(k,v){this.attrs[k]=v;}};
 const elements={password:field,sgPasswordToggle:button};
 const window={},document={getElementById:id=>elements[id]||null};
 vm.runInNewContext(source,{window,document});
 return {field,button,ui:window.sgPasswordPreview};
}
test('mot de passe masqué par défaut et aucun envoi automatique',()=>{
 const x=start();assert.equal(x.field.type,'password');
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|\.value\s*=/);
});
test('afficher et masquer conserve le mot de passe saisi',()=>{
 const x=start();const secret=x.field.value;
 x.ui.toggle();
 assert.equal(x.field.type,'text');assert.equal(x.field.value,secret);
 assert.equal(x.button.attrs['aria-pressed'],'true');
 x.ui.toggle();
 assert.equal(x.field.type,'password');assert.equal(x.field.value,secret);
 assert.equal(x.button.attrs['aria-pressed'],'false');
});
test('reset masque le champ sans supprimer ses caractères',()=>{
 const x=start();x.ui.toggle();x.ui.reset();
 assert.equal(x.field.type,'password');
 assert.equal(x.button.textContent,'Afficher le mot de passe');
 assert.equal(x.field.value,'UnMotDePasseFictif123');
});
test('l’interface masque le mot de passe sur changement de mode et déconnexion',()=>{
 assert.match(html,/id="sgPasswordToggle"/);
 assert.match(html,/window\.sgPasswordPreview\?\.reset\(\)/);
 assert.match(html,/assets\/afficher-mot-de-passe-test\.js/);
});
