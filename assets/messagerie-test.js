/* SAMGO — Messagerie entre participants d'une simulation, jamais une vraie course.
   Aucun GPS, numéro, document ou carte bancaire collecté ici. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const view={
  client:{selector:'sgChatClientChoices',messages:'sgChatClientMessages',input:'sgChatClientInput',send:'sgChatClientSend',status:'sgChatClientStatus'},
  driver:{selector:'sgChatDriverChoices',messages:'sgChatDriverMessages',input:'sgChatDriverInput',send:'sgChatDriverSend',status:'sgChatDriverStatus'}
 };
 const state={client:{current:null,choices:[],seq:0,sending:false,sendKey:null,lastIncoming:new Map(),drafts:new Map()},
 driver:{current:null,choices:[],seq:0,sending:false,sendKey:null,lastIncoming:new Map(),drafts:new Map()},user:null};
 function signed(){return typeof sessionUser!=='undefined'&&!!sessionUser&&typeof client!=='undefined'&&!!client?.testMessages&&!!client?.testChoices;}
 function say(role,text){const el=$(view[role].status);if(el)el.textContent=text;}
 function note(role,text){
  const a=document.createElement('p');a.className='sg-chat-test-entry';a.textContent=text;
  const box=$(view[role].messages);if(box){box.replaceChildren(a);}
 }
 function dismissNotice(){
  const toast=$('sgChatNewToast');
  if(toast){toast.hidden=true;toast.removeAttribute?.('data-role');}
 }
 function showNotice(role){
  if(!signed()||!['client','driver'].includes(role))return;
  const toast=$('sgChatNewToast');
  if(!toast)return;
  toast.setAttribute('data-role',role);
  const label=$('sgChatNewText');
  if(label)label.textContent='🔔 Nouveau message de TEST — aucun détail personnel affiché.';
  toast.hidden=false;
 }
 function openNotice(){
  const toast=$('sgChatNewToast'),role=toast?.getAttribute?.('data-role');
  if(!signed()||sessionUser.id!==state.user||!['client','driver'].includes(role)){
   dismissNotice();return;
  }
  if(typeof sgGo==='function')sgGo(role==='client'?'trips':'driver');
  if(role==='driver'&&typeof driverTab==='function')driverTab('missions');
  const target=$(view[role].messages);
  target?.scrollIntoView?.({behavior:'smooth',block:'center'});
  dismissNotice();
 }
 function choiceLabel(row,role,i){return 'Simulation n°'+(i+1)+' — '+(row.statut==='choisi_test'?'en cours':row.statut==='termine_test'?'terminée':'annulée');}
 function captureDraft(role){
  const st=state[role],input=$(view[role].input);
  if(st.current&&input)st.drafts.set(st.current,input.value.slice(0,500));
 }
 function restoreDraft(role){
  const st=state[role],input=$(view[role].input);
  if(input)input.value=st.current?(st.drafts.get(st.current)||''):'';
 }
 function updateButtons(role){
  const cfg=view[role],st=state[role],node=$(cfg.selector);
  if(!node)return;
  node.replaceChildren();
  for(let i=0;i<st.choices.length;i++){
   const row=st.choices[i],button=document.createElement('button');
   button.type='button';button.className='alt sg-chat-test-choice';
   button.textContent=choiceLabel(row,role,i);
   button.setAttribute('aria-pressed',String(st.current===row.id));
   button.addEventListener('click',()=>{
    if(st.current!==row.id){
     captureDraft(role);
     st.current=row.id;
     restoreDraft(role);
    }
    updateButtons(role);return loadMessages(role,{jumpToEnd:true});
   });
   node.append(button);
  }
  const current=st.choices.find(c=>c.id===st.current);
  const allowed=!!current&&current.statut==='choisi_test';
  const input=$(cfg.input),send=$(cfg.send);
  if(input){input.disabled=!allowed;input.placeholder=allowed?'Écrire un message de TEST (500 caractères max)':'Choisissez une simulation en cours pour écrire';}
  if(send)send.disabled=!allowed||st.sending;
  window.sgQuickReplyTest?.setEnabled?.(role,allowed&&!st.sending);
 }
 async function refresh(role){
  if(!view[role])return;
  const st=state[role];
  if(!signed()){
   stop();
   return;
  }
  const uid=sessionUser.id;
  if(state.user!==uid){
   dismissNotice();
   state.user=uid;
   for(const side of ['client','driver']){
    state[side].current=null;state[side].choices=[];state[side].seq++;
    state[side].sending=false;state[side].sendKey=null;state[side].lastIncoming.clear();
    state[side].drafts.clear();
    const input=$(view[side].input);if(input)input.value='';
   }
  }
  const my=++st.seq;
  try{
   const data=await client.testChoices.list();
   if(data.error)throw data.error;
   if(my!==st.seq||!signed()||sessionUser.id!==uid)return;
   const rows=(Array.isArray(data.data)?data.data:[])
    .filter(c=>(role==='client'?c.client_id:c.chauffeur_id)===uid)
    .filter(c=>['choisi_test','termine_test','annule_test'].includes(c.statut)).slice(0,20);
   st.choices=rows;
   for(const id of st.lastIncoming.keys())if(!rows.some(c=>c.id===id))st.lastIncoming.delete(id);
   for(const id of st.drafts.keys())if(!rows.some(c=>c.id===id))st.drafts.delete(id);
   let selectedChanged=false;
   if(!rows.some(c=>c.id===st.current)){
    st.current=rows.length?rows[0].id:null;
    restoreDraft(role);
    selectedChanged=true;
   }
   updateButtons(role);
   if(!rows.length){
    note(role,role==='client'
     ?'Aucune conversation TEST : une annonce doit recevoir une réponse puis le client doit choisir un chauffeur. Une simple annonce ne débloque pas le chat.'
     :'Aucune conversation TEST : consultez les demandes dans Missions et signalez votre intérêt. Le client doit ensuite vous choisir pour ouvrir le chat.');
    say(role,'Aucune discussion active. Aucun message n’a été envoyé.');return;
   }
   await loadMessages(role,{jumpToEnd:selectedChanged});
  }catch(e){if(my===st.seq&&state.user===uid&&signed()&&sessionUser.id===uid)
   say(role,'Messages TEST indisponibles : '+(e.message||'Réessayez.'));}
 }
 async function loadMessages(role,{jumpToEnd=false}={}){
  const st=state[role],choice=st.current,cfg=view[role];
  if(!choice){note(role,'Choisissez une simulation de test.');return;}
  const currentUser=state.user,seq=++st.seq;
  say(role,'Chargement des messages fictifs…');
  try{
   const result=await client.testMessages.list(choice);
   if(result.error)throw result.error;
   if(st.current!==choice||seq!==st.seq||state.user!==currentUser||!signed()||sessionUser.id!==currentUser)return;
   const box=$(cfg.messages);if(!box)return;
   const nearBottom=Number.isFinite(box.scrollHeight)&&Number.isFinite(box.scrollTop)&&
    Number.isFinite(box.clientHeight)&&
    box.scrollHeight-box.scrollTop-box.clientHeight<70;
   box.replaceChildren();
   const rows=Array.isArray(result.data)?result.data:[];
   if(!rows.length)note(role,'Aucun message pour cette simulation.');
   for(const row of rows){
    const article=document.createElement('div');
    article.className='sg-chat-test-entry '+(row.auteur_id===currentUser?'sg-chat-test-mine':'sg-chat-test-theirs');
    const who=document.createElement('strong');
    who.textContent=row.auteur_id===currentUser?'Moi (TEST)':'Autre participant (TEST)';
    const p=document.createElement('p');p.textContent=row.contenu;
    const small=document.createElement('small');
    const d=new Date(row.cree_le);
    small.textContent=Number.isFinite(d.getTime())?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d):'TEST';
    article.append(who,p,small);box.append(article);
   }
   // Signal de nouveau message seulement si cette conversation a déjà
   // été ouverte dans la session courante. Pas de notification de fond.
   const incoming=rows.filter(row=>row.auteur_id!==currentUser);
   const newest=incoming.length?incoming[incoming.length-1].id:null;
   const prior=st.lastIncoming.get(choice);
   const hasBaseline=st.lastIncoming.has(choice);
   st.lastIncoming.set(choice,newest);
   // Nouvel écran : afficher le dernier message. Pendant la lecture d'anciens
   // échanges, ne pas déplacer l'écran à chaque actualisation automatique.
   if((jumpToEnd||nearBottom)&&Number.isFinite(box.scrollHeight))
    box.scrollTop=box.scrollHeight;
   if(hasBaseline&&newest&&newest!==prior){
    say(role,'🔔 Nouveau message de TEST reçu. '+rows.length+' message(s) affiché(s).');
    if(document.visibilityState!=='hidden')showNotice(role);
   }else say(role,rows.length+' message(s) de TEST. Actualisation quand SAMGO est ouvert.');
  }catch(e){if(st.current===choice&&seq===st.seq&&state.user===currentUser&&signed()&&sessionUser.id===currentUser)
    say(role,'Impossible de lire cette conversation : '+(e.message||'Réessayez.'));}
 }
 async function send(role){
  if(!signed()||!view[role])return;
  const st=state[role],cfg=view[role],row=st.choices.find(c=>c.id===st.current);
  const input=$(cfg.input),text=(input?.value||'').trim();
  if(!row||row.statut!=='choisi_test'){say(role,'La messagerie est réservée aux simulations en cours.');return;}
  if(!text||text.length>500){say(role,'Entrez entre 1 et 500 caractères.');return;}
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   say(role,'Hors connexion : message non envoyé, votre brouillon reste disponible.');
   return;
  }
  if(st.sending)return;
  const uid=sessionUser.id,choiceId=row.id,sendKey={};
  // Ne plus réutiliser un résultat de requête si l'utilisateur ou le chat change.
  const stillCurrent=()=>st.sendKey===sendKey&&signed()&&
    sessionUser.id===uid&&state.user===uid&&st.current===choiceId;
  st.sending=true;st.sendKey=sendKey;
  updateButtons(role);say(role,'Envoi du message fictif…');
  try{
   const result=await client.testMessages.create(choiceId,uid,text);
   if(!stillCurrent())return;
   if(result.error)throw result.error;
   // Ne pas effacer une nouvelle rédaction saisie pendant la requête.
   if(input&&input.value.trim()===text){
    input.value='';
    st.drafts.delete(choiceId);
   }
   await loadMessages(role,{jumpToEnd:true});
  }catch(e){
   if(stillCurrent())say(role,'Envoi refusé : '+(e.message||'Réessayez.'));
  }finally{
   if(st.sendKey===sendKey){st.sendKey=null;st.sending=false;updateButtons(role);}
  }
 }
 function stop(){
  dismissNotice();
  state.user=null;
  for(const role of ['client','driver']){
   const st=state[role];st.current=null;st.choices=[];st.seq++;st.sending=false;st.sendKey=null;st.lastIncoming.clear();st.drafts.clear();
   const input=$(view[role].input);if(input)input.value='';
   updateButtons(role);note(role,'Connectez-vous pour consulter vos messages fictifs.');say(role,'Messagerie de TEST.');
  }
 }
 for(const role of ['client','driver']){
  const cfg=view[role];
  const bind=()=>{
   const input=$(cfg.input);
   if(input){
    input.addEventListener('input',()=>captureDraft(role));
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(role);}});
   }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 }
 // En présence d'une conversation ouverte, vérifier uniquement ses messages toutes
 // les 15 s : plus réactif que le rafraîchissement général de 45 s, sans GPS ni push.
 // Aucun appel quand la page est cachée, hors ligne, déconnectée ou sans chat choisi.
 if(typeof setInterval==='function')setInterval(()=>{
  if(document.visibilityState==='hidden'||typeof navigator!=='undefined'&&navigator.onLine===false||!signed())return;
  const classes=document.body?.classList;
  const role=classes?.contains('sg-route-trips')?'client':
   classes?.contains('sg-route-driver')?'driver':null;
  if(!role||!state[role].current||state[role].sending)return;
  return loadMessages(role);
 },15000);
 window.sgChatTest={refresh,send,stop,openNotice,dismissNotice};
})();
