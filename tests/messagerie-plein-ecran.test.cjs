'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/messagerie-plein-ecran-test.css','utf8');
const source=fs.readFileSync('assets/messagerie-plein-ecran-test.js','utf8');
function fixture(){
 const map=new Map();
 const make=(tag='div',id='')=>({
  tagName:tag,id,hidden:false,disabled:false,value:'',textContent:'',className:'',scrollHeight:100,scrollTop:0,clientHeight:40,
  children:[],listeners:{},attrs:{},
  replaceChildren(...nodes){this.children=[...nodes];},
  append(...nodes){this.children.push(...nodes);},
  addEventListener(event,fn){this.listeners[event]=fn;},
  setAttribute(name,value){this.attrs[name]=value;},
  removeAttribute(name){delete this.attrs[name];}
 });
 const $=id=>{
  if(!map.has(id))map.set(id,make('div',id));
  return map.get(id);
 };
 const classes=new Set();
 const document={
  readyState:'complete',visibilityState:'visible',
  body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},
  getElementById:$,createElement:tag=>make(tag),listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn;}
 };
 const events={};
 const window={addEventListener(name,fn){events[name]=fn;}};
 const messages=[];
 const items=[{id:'c-1',client_id:'client-1',chauffeur_id:'driver-1',statut:'choisi_test',cree_le:'2026-11-02T10:00:00Z'}];
 const client={
  testChoices:{list:async()=>({data:items,error:null})},
  testMessages:{
   list:async(id)=>({data:messages.filter(m=>m.choix_id===id),error:null}),
   create:async(id,uid,message)=>{
    messages.push({id:'m-'+(messages.length+1),choix_id:id,auteur_id:uid,contenu:message,cree_le:new Date().toISOString()});
    return {error:null};
   }
  }
 };
 const ctx=vm.createContext({document,window,sessionUser:{id:'client-1'},driverSimAllowed:true,client,
  navigator:{onLine:true},setInterval:()=>{},Date,Intl});
 vm.runInContext(source,ctx,{timeout:1000});
 const api=window.sgChatPage;
 async function flush(){await new Promise(setImmediate);await new Promise(setImmediate);}
 return {api,ctx,$,messages,items,classes,flush};
}
test('le vrai écran de messages est plein écran ; anciens mini-chats masqués',()=>{
 assert.match(css,/#sgFullChatPage\{position:fixed!important;inset:0/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/#sgFullChatMessages\{flex:1 1 auto/);
 assert.match(css,/\.sg-fullchat-composer\{flex:0 0 auto/);
 assert.match(html,/id="sgFullChatPage" role="dialog" aria-modal="true"/);
 assert.match(html,/id="sgRideChatDemoPanel" class="sg-ride-chat-local" hidden/);
 assert.match(html,/class="sg-chat-test" hidden aria-label="Ancienne messagerie fictive — client"/);
 assert.match(html,/class="sg-chat-test" hidden aria-label="Ancienne messagerie fictive — chauffeur"/);
 assert.match(html,/onclick="window.sgChatPage.open\('client'\)"/);
 assert.match(html,/onclick="window.sgChatPage.open\('driver'\)"/);
 assert.match(html,/assets\/messagerie-plein-ecran-test.js\?v=/);
});
test('les comptes client et chauffeur disposent de boîtes séparées, avec messages en bulle',async()=>{
 const f=fixture();const {api,ctx,$,flush,messages}=f;
 assert.equal(api.isOpen(),false);
 assert.equal(api.open('client'),true);
 await flush();
 assert.equal(api.isOpen(),true);
 assert.equal($('sgFullChatPage').hidden,false);
 assert.equal($('sgFullChatList').children.length,1);
 assert.equal(api.select('c-1'),true);
 await flush();
 assert.equal($('sgFullChatThread').hidden,false);
 $('sgFullChatInput').value='Bonjour, je vous attends au point fictif';
 assert.equal(await api.send(),true);
 await flush();
 assert.equal(messages.length,1);
 assert.equal(messages[0].auteur_id,'client-1');
 assert.equal($('sgFullChatMessages').children[0].children[0].textContent,messages[0].contenu);
 assert.match($('sgFullChatMessages').children[0].className,/sg-fullchat-mine/);
 // Changer de compte : les données du client sont effacées immédiatement.
 api.reset();
 ctx.sessionUser={id:'driver-1'};
 assert.equal(api.open('driver'),true);
 await flush();
 assert.equal($('sgFullChatList').children.length,1);
 assert.equal(api.select('c-1'),true);
 await flush();
 assert.match($('sgFullChatMessages').children[0].className,/sg-fullchat-theirs/);
 assert.equal($('sgFullChatMessages').children[0].children[0].textContent,messages[0].contenu);
 $('sgFullChatInput').value='Bonjour, j’arrive dans 5 minutes (TEST)';
 assert.equal(await api.send(),true);
 await flush();
 assert.equal(messages.length,2);
 assert.equal(messages[1].auteur_id,'driver-1');
 api.reset();
 ctx.sessionUser={id:'client-1'};
 api.open('client');await flush();api.select('c-1');await flush();
 assert.equal($('sgFullChatMessages').children.length,2);
 assert.match($('sgFullChatMessages').children[1].className,/sg-fullchat-theirs/);
 assert.equal($('sgFullChatMessages').children[1].children[0].textContent,messages[1].contenu);
});
test('pas de messages sans compte, pas d’écriture après fin de course TEST',async()=>{
 const f=fixture();const {api,ctx,$,items,flush,messages}=f;
 ctx.sessionUser=null;api.open('client');await flush();
 assert.equal($('sgFullChatEmpty').hidden,false);
 assert.equal(api.select('c-1'),false);
 api.reset();ctx.sessionUser={id:'client-1'};
 items[0].statut='termine_test';
 api.open('client');await flush();api.select('c-1');await flush();
 assert.equal($('sgFullChatInput').disabled,true);
 $('sgFullChatInput').value='Pas autorisé';
 assert.equal(await api.send(),false);
 assert.equal(messages.length,0);
});
test('un autre compte ne voit pas les discussions et aucune donnée persistante',async()=>{
 const f=fixture();const {api,ctx,$,flush}=f;
 ctx.sessionUser={id:'inconnu'};
 api.open('client');await flush();
 assert.equal($('sgFullChatList').children.length,0);
 assert.equal(api.select('c-1'),false);
 api.reset();
 assert.equal($('sgFullChatMessages').children.length,0);
 assert.equal(api.isOpen(),false);
 assert.doesNotMatch(source,/localStorage|sessionStorage|innerHTML\s*=/);
});
test('le texte utilisateur est rendu sans HTML et les messages sont limités à 500 caractères',async()=>{
 const f=fixture();const {api,$,messages,flush}=f;
 api.open('client');await flush();api.select('c-1');await flush();
 $('sgFullChatInput').value='<img onerror="alert(1)" src=x>';
 assert.equal(await api.send(),true);
 await flush();
 assert.equal($('sgFullChatMessages').children[0].children[0].textContent,'<img onerror="alert(1)" src=x>');
 $('sgFullChatInput').value='x'.repeat(501);
 assert.equal(await api.send(),false);
 assert.equal(messages.length,1);
 assert.match(html,/maxlength="500"/);
});
test('la page se ferme et supprime immédiatement les messages en cas de déconnexion',async()=>{
 const f=fixture();const {api,$,classes,flush}=f;
 api.open('client');await flush();api.select('c-1');await flush();
 api.reset();
 assert.equal(api.isOpen(),false);
 assert.equal($('sgFullChatPage').hidden,true);
 assert.equal(classes.has('sg-chat-fullscreen-open'),false);
 assert.equal($('sgFullChatMessages').children.length,0);
 assert.match(html,/if\(window\.sgChatPage\)window\.sgChatPage\.reset\(\)/);
});
