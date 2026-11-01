/* SAMGO — banc d'essai réservation + messagerie, entièrement local.
 * AUCUN appel réseau, aucun GPS, aucune donnée persistée, aucun chauffeur réel.
 * Deux vues dans le même navigateur pour tester envoi ET réception sans compte.
 * Ce banc d'essai ne remplace pas la messagerie authentifiée Supabase.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const state={stage:'idle',messages:[],sequence:0};
function label(){
 return {idle:'Aucune réservation',requested:'Demande fictive envoyée',accepted:'Chauffeur fictif disponible',completed:'Trajet fictif terminé'}[state.stage];
}
function allowedSend(){return state.stage==='accepted';}
function update(){
 const stage=$('sgRideChatDemoStage'),status=$('sgRideChatDemoStatus');
 if(stage)stage.textContent='Étape : '+label()+' — simulation locale uniquement.';
 const controls={
  sgRideChatDemoStart:state.stage==='idle',
  sgRideChatDemoAccept:state.stage==='requested',
  sgRideChatDemoClientSend:allowedSend(),
  sgRideChatDemoDriverSend:allowedSend(),
  sgRideChatDemoFinish:allowedSend(),
  sgRideChatDemoReset:state.stage!=='idle'
 };
 for(const [id,enabled]of Object.entries(controls)){
  const el=$(id);if(el)el.disabled=!enabled;
 }
 for(const id of ['sgRideChatDemoClientInput','sgRideChatDemoDriverInput']){
  const el=$(id);if(el)el.disabled=!allowedSend();
 }
 for(const role of ['client','driver']){
  const box=$('sgRideChatDemo'+(role==='client'?'Client':'Driver')+'Log');
  if(!box)continue;
  box.replaceChildren();
  if(!state.messages.length){
   const p=document.createElement('p');p.textContent='Aucun message envoyé dans cet essai.';p.className='sg-ride-chat-empty';
   box.appendChild(p);
  }
  for(const row of state.messages){
   const bubble=document.createElement('div');
   const mine=row.sender===role;
   bubble.className='sg-ride-chat-bubble '+(mine?'sg-ride-chat-mine':'sg-ride-chat-other');
   const who=document.createElement('strong');
   who.textContent=mine?'Moi — envoyé (simulation)':(row.sender==='client'?'Client':'Chauffeur')+' — reçu (simulation)';
   const text=document.createElement('p');text.textContent=row.message;
   bubble.append(who,text);box.appendChild(bubble);
  }
  box.scrollTop=box.scrollHeight;
 }
 if(status&&state.stage==='idle')status.textContent='Lancez une demande fictive : aucun compte ni réseau nécessaire.';
}
function start(){
 if(state.stage!=='idle')return false;
 state.stage='requested';update();
 const st=$('sgRideChatDemoStatus');if(st)st.textContent='Demande de TEST créée localement. Cliquez sur « Le chauffeur accepte ».';
 return true;
}
function accept(){
 if(state.stage!=='requested')return false;
 state.stage='accepted';update();
 const st=$('sgRideChatDemoStatus');if(st)st.textContent='Chauffeur fictif sélectionné. Vous pouvez envoyer un message, puis répondre depuis la vue chauffeur.';
 return true;
}
function send(role){
 if(!allowedSend()||!['client','driver'].includes(role))return false;
 const input=$(role==='client'?'sgRideChatDemoClientInput':'sgRideChatDemoDriverInput');
 const value=String(input?.value||'').trim();
 const st=$('sgRideChatDemoStatus');
 if(value.length<1||value.length>500){
  if(st)st.textContent='Écrivez un message fictif de 1 à 500 caractères.';
  return false;
 }
 state.messages.push({id:++state.sequence,sender:role,message:value});
 // Éviter un historique indéfini en mémoire.
 if(state.messages.length>40)state.messages.shift();
 if(input)input.value='';
 update();
 if(st)st.textContent='✓ Message envoyé côté '+(role==='client'?'client':'chauffeur')+
  ', reçu dans la vue '+(role==='client'?'chauffeur':'client')+' sur ce téléphone. TEST LOCAL, aucun serveur contacté.';
 return true;
}
function sendClient(){return send('client');}
function sendDriver(){return send('driver');}
function complete(){
 if(!allowedSend())return false;
 state.stage='completed';update();
 const st=$('sgRideChatDemoStatus');if(st)st.textContent='✓ Réservation fictive terminée. Conversation figée, aucun paiement ni trajet réel.';
 return true;
}
function reset(){
 state.stage='idle';state.messages=[];state.sequence=0;
 for(const id of ['sgRideChatDemoClientInput','sgRideChatDemoDriverInput']){
  const input=$(id);if(input)input.value='';
 }
 update();return true;
}
function snapshot(){return {stage:state.stage,count:state.messages.length,messages:state.messages.map(x=>({...x}))};}
function bind(){
 for(const [id,role] of [['sgRideChatDemoClientInput','client'],['sgRideChatDemoDriverInput','driver']]){
  const field=$(id);if(!field)return;
  field.addEventListener('keydown',event=>{
   if(event.key==='Enter'&&!event.shiftKey){
    event.preventDefault();send(role);
   }
  });
 }
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
else bind();
window.sgRideChatDemo={start,accept,sendClient,sendDriver,complete,reset,snapshot};
})();