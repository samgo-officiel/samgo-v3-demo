/* SAMGO — messagerie plein écran pour clients et chauffeurs approuvés.
 * Echanges entre DEUX comptes authentifiés via tables RLS Supabase, TEST uniquement.
 * Aucun vrai trajet, pas de messages vocaux, ni stockage local, ni push en arrière-plan.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const validRole=role=>role==='client'||role==='driver';
const state={open:false,role:null,uid:null,view:'inbox',items:[],selected:null,
 generation:0,inboxSeq:0,threadSeq:0,threadPending:null,sending:false,
 drafts:new Map(),lastIncoming:new Map()};
function signed(){
 return typeof sessionUser!=='undefined'&&!!sessionUser?.id&&
  typeof client!=='undefined'&&!!client?.testMessages&&!!client?.testChoices;
}
function authorized(role){
 return signed()&&(role==='client'||role==='driver'&&
  typeof driverSimAllowed!=='undefined'&&driverSimAllowed===true);
}
function still(uid,role,gen){
 return state.open&&state.generation===gen&&state.uid===uid&&state.role===role&&
  signed()&&sessionUser.id===uid&&authorized(role);
}
function say(message){const el=$('sgFullChatStatus');if(el)el.textContent=message;}
function clearBox(el){if(el)el.replaceChildren();}
function node(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
}
function timeLabel(value){
 const date=new Date(value);
 return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('fr-FR',
  {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(date):'';
}
function pillStatus(c){
 return c.statut==='choisi_test'?'En cours (TEST)':
  c.statut==='termine_test'?'Terminée (TEST)':'Annulée (TEST)';
}
function draft(){
 const input=$('sgFullChatInput');
 if(state.selected&&input)state.drafts.set(state.selected,input.value.slice(0,500));
}
function composer(){
 const box=$('sgFullChatComposer'),input=$('sgFullChatInput'),send=$('sgFullChatSend');
 const choice=state.items.find(c=>c.id===state.selected);
 const writable=!!choice&&choice.statut==='choisi_test'&&authorized(state.role);
 if(box)box.hidden=state.view!=='thread';
 if(input){
  input.disabled=!writable||state.sending;
  input.placeholder=writable?'Écrire un message…':'Cette conversation est en lecture seule';
 }
 if(send)send.disabled=!writable||state.sending;
 const label=$('sgFullChatReadOnly');
 if(label){label.hidden=state.view!=='thread'||writable;
  if(!label.hidden)label.textContent='Conversation terminée ou annulée : lecture seule.';}
}
function screen(){
 const dialog=$('sgFullChatPage');if(!dialog)return;
 dialog.hidden=!state.open;
 if(!state.open)return;
 const inbox=$('sgFullChatInbox'),thread=$('sgFullChatThread');
 if(inbox)inbox.hidden=state.view!=='inbox';
 if(thread)thread.hidden=state.view!=='thread';
 const title=$('sgFullChatTitle'),subtitle=$('sgFullChatSubtitle');
 const roleLabel=state.role==='driver'?'Espace chauffeur':'Espace client';
 if(title)title.textContent=state.view==='thread'?
  (state.role==='driver'?'Conversation avec un client':'Conversation avec un chauffeur'):'Mes messages';
 if(subtitle)subtitle.textContent=roleLabel+' · Version TEST';
 const back=$('sgFullChatBack');
 if(back)back.textContent=state.view==='thread'?'‹ Discussions':'‹ Retour';
 const next=$('sgFullChatEmptyAction');
 if(next)next.textContent=state.role==='driver'?'Voir les demandes TEST':'Créer une demande TEST';
 composer();
}
function renderInbox(){
 const list=$('sgFullChatList');if(!list)return;
 clearBox(list);
 const empty=$('sgFullChatEmpty');
 if(empty)empty.hidden=state.items.length!==0;
 for(let i=0;i<state.items.length;i++){
  const item=state.items[i];
  const button=node('button','sg-fullchat-row');
  button.type='button';
  const avatar=node('span','sg-fullchat-avatar',state.role==='driver'?'C':'C');
  avatar.setAttribute('aria-hidden','true');
  const info=node('span','sg-fullchat-row-info');
  const name=node('strong',null,state.role==='driver'?'Client · demande TEST '+(i+1):
   'Chauffeur · réservation TEST '+(i+1));
  const description=node('span','sg-fullchat-row-preview',
   state.lastIncoming.has(item.id)?'Ouvrir la conversation et retrouver les messages.':
   'Appuyer pour ouvrir la conversation.');
  const status=node('span','sg-fullchat-row-status',pillStatus(item));
  info.append(name,description,status);
  const arrow=node('span','sg-fullchat-row-arrow','›');
  arrow.setAttribute('aria-hidden','true');
  button.append(avatar,info,arrow);
  button.addEventListener('click',()=>select(item.id));
  list.append(button);
 }
}
function renderMessages(rows,jump){
 const box=$('sgFullChatMessages');if(!box)return;
 const nearBottom=Number.isFinite(box.scrollHeight)&&Number.isFinite(box.scrollTop)&&
  Number.isFinite(box.clientHeight)&&box.scrollHeight-box.scrollTop-box.clientHeight<85;
 clearBox(box);
 if(!rows.length)box.append(node('p','sg-fullchat-empty-thread','Aucun message. Écrivez le premier message de TEST.'));
 for(const m of rows){
  const mine=m.auteur_id===state.uid;
  const article=node('article','sg-fullchat-bubble '+(mine?'sg-fullchat-mine':'sg-fullchat-theirs'));
  const message=node('p',null,m.contenu);
  const footer=node('small',null,(mine?'Envoyé':'Reçu')+' · '+timeLabel(m.cree_le));
  article.append(message,footer);
  box.append(article);
 }
 if(jump||nearBottom)box.scrollTop=box.scrollHeight;
}
function open(role){
 if(!validRole(role))return false;
 if(state.open&&state.uid===sessionUser?.id&&state.role===role){
  state.view='inbox';screen();refresh();return true;
 }
 reset();
 state.open=true;state.role=role;state.uid=signed()?sessionUser.id:null;
 state.view='inbox';
 const dialog=$('sgFullChatPage');if(!dialog){reset();return false;}
 document.body?.classList?.add('sg-chat-fullscreen-open');
 screen();
 if(!authorized(role)){
  say(role==='driver'?'Connectez-vous avec un compte chauffeur approuvé pour ouvrir vos messages.':
   'Connectez-vous à votre compte client pour ouvrir vos messages.');
  renderInbox();return true;
 }
 say('Chargement de vos discussions de TEST…');
 refresh();
 return true;
}
function close(){
 state.open=false;
 state.generation++;state.inboxSeq++;state.threadSeq++;
 const dialog=$('sgFullChatPage');if(dialog)dialog.hidden=true;
 document.body?.classList?.remove('sg-chat-fullscreen-open');
}
function reset(){
 close();
 state.role=null;state.uid=null;state.view='inbox';
 state.items=[];state.selected=null;state.threadPending=null;state.sending=false;
 state.drafts.clear();state.lastIncoming.clear();
 const input=$('sgFullChatInput');if(input)input.value='';
 clearBox($('sgFullChatMessages'));
 clearBox($('sgFullChatList'));
}
function back(){
 if(!state.open)return;
 if(state.view==='thread'){
  draft();state.threadSeq++;state.threadPending=null;
  state.selected=null;state.view='inbox';screen();renderInbox();
  say('Choisissez une discussion pour consulter ses messages.');
 }else close();
}
function goAccount(){close();if(typeof sgGo==='function')sgGo('account');}
function goNext(){
 const role=state.role;close();
 if(typeof sgGo==='function')sgGo(role==='driver'?'driver':'book');
 if(role==='driver'&&typeof driverTab==='function')driverTab('missions');
}
async function refresh(){
 if(!state.open)return;
 const role=state.role;
 if(!authorized(role)||state.uid!==sessionUser.id){
  reset();return;
 }
 const uid=state.uid,gen=state.generation,seq=++state.inboxSeq;
 try{
  const result=await client.testChoices.list();
  if(!still(uid,role,gen)||seq!==state.inboxSeq)return;
  if(result.error)throw result.error;
  const rows=(Array.isArray(result.data)?result.data:[])
   .filter(c=>(role==='client'?c.client_id:c.chauffeur_id)===uid)
   .filter(c=>['choisi_test','termine_test','annule_test'].includes(c.statut))
   .slice(0,30);
  state.items=rows;
  if(state.selected&&!rows.some(c=>c.id===state.selected)){
   state.threadSeq++;state.threadPending=null;
   state.view='inbox';state.selected=null;
  }
  renderInbox();screen();
  if(!rows.length)say(role==='client'?
   'Aucune discussion. Publiez une demande TEST, puis choisissez un chauffeur qui a répondu.':
   'Aucune discussion. Répondez à une demande TEST et attendez que le client vous choisisse.');
  else if(state.view==='inbox')say(rows.length+' conversation(s) de TEST. Touchez une discussion pour l’ouvrir.');
  if(state.view==='thread')await loadThread(false);
 }catch(e){
  if(still(uid,role,gen)&&seq===state.inboxSeq)
   say('Impossible de charger les messages : '+(e.message||'Réessayez.'));
 }
}
function select(id){
 const choice=state.items.find(x=>x.id===id);
 if(!choice||!authorized(state.role)||!state.open)return false;
 draft();
 state.selected=id;state.view='thread';state.threadSeq++;state.threadPending=null;
 const input=$('sgFullChatInput');if(input)input.value=state.drafts.get(id)||'';
 clearBox($('sgFullChatMessages'));
 screen();say('Chargement de la conversation de TEST…');
 loadThread(true);
 return true;
}
async function loadThread(jump=false){
 if(!state.open||state.view!=='thread'||!state.selected||!authorized(state.role))return;
 const choice=state.selected,uid=state.uid,role=state.role,gen=state.generation;
 if(state.threadPending?.id===choice){
  state.threadPending.jump=state.threadPending.jump||jump;return;
 }
 const seq=++state.threadSeq,pending={id:choice,jump};
 state.threadPending=pending;
 try{
  const res=await client.testMessages.list(choice);
  if(!still(uid,role,gen)||state.selected!==choice||state.view!=='thread'||state.threadSeq!==seq)return;
  if(res.error)throw res.error;
  const rows=Array.isArray(res.data)?res.data:[];
  renderMessages(rows,pending.jump);
  const incoming=rows.filter(x=>x.auteur_id!==uid);
  const newest=incoming.length?incoming[incoming.length-1].id:null;
  const had=state.lastIncoming.has(choice),previous=state.lastIncoming.get(choice);
  state.lastIncoming.set(choice,newest);
  say(had&&newest&&previous!==newest?
   '✓ Nouveau message reçu (TEST).':'Messages synchronisés · actualisation quand SAMGO est ouvert.');
 }catch(e){
  if(still(uid,role,gen)&&state.selected===choice&&state.threadSeq===seq)
   say('Impossible de récupérer la conversation : '+(e.message||'Réessayez.'));
 }finally{if(state.threadPending===pending)state.threadPending=null;}
}
async function send(){
 if(!state.open||state.view!=='thread'||!authorized(state.role)||state.sending)return false;
 const choice=state.items.find(c=>c.id===state.selected);
 const input=$('sgFullChatInput'),message=String(input?.value||'').trim();
 if(!choice||choice.statut!=='choisi_test'){
  say('Conversation terminée ou annulée : envoi impossible.');return false;
 }
 if(!message||message.length>500){say('Écrivez un message de 1 à 500 caractères.');return false;}
 if(typeof navigator!=='undefined'&&navigator.onLine===false){
  say('Hors connexion : message non envoyé, le texte est conservé.');return false;
 }
 const uid=state.uid,role=state.role,gen=state.generation,id=choice.id;
 state.sending=true;composer();say('Envoi du message TEST…');
 try{
  const result=await client.testMessages.create(id,uid,message);
  if(!still(uid,role,gen)||state.selected!==id||state.view!=='thread')return false;
  if(result.error)throw result.error;
  if(input&&input.value.trim()===message){input.value='';state.drafts.delete(id);}
  // Les réponses tardives d'une ancienne lecture ne peuvent pas effacer ce nouvel envoi.
  state.threadSeq++;state.threadPending=null;
  say('✓ Message envoyé sur la conversation TEST.');
  await loadThread(true);
  return true;
 }catch(e){
  if(still(uid,role,gen)&&state.selected===id)
   say('Message non envoyé : '+(e.message||'Réessayez.'));
  return false;
 }finally{
  if(still(uid,role,gen)&&state.selected===id){state.sending=false;composer();}
 }
}
function isOpen(){return state.open;}
function mount(){
 const input=$('sgFullChatInput');
 if(input){
  input.addEventListener('input',draft);
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
  });
 }
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&state.open){e.preventDefault();back();}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
// L'écran doit être ouvert et au premier plan pour actualiser. Pas de push, ni de vocaux.
function poll(){
 if(!state.open||document.visibilityState==='hidden')return;
 if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
 if(!authorized(state.role)||sessionUser.id!==state.uid){reset();return;}
 if(state.view==='thread'){if(!state.sending)loadThread(false);}
 else refresh();
}
if(typeof setInterval==='function')setInterval(poll,10000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')poll();});
window.addEventListener('online',poll);
window.sgChatPage={open,close,reset,back,refresh,select,send,goAccount,goNext,isOpen};
})();