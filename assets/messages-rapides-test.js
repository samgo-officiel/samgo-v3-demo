/* SAMGO TEST — propositions de messages à envoyer manuellement.
 * Aucun message envoyé automatiquement, aucune donnée personnelle collectée.
 */
(function(){
 'use strict';
 const config={
  client:{container:'sgChatClientQuick',input:'sgChatClientInput',
   texts:['Bonjour, je suis prêt pour cette simulation.','Merci, bien reçu !','Pouvez-vous confirmer le lieu fictif ?']},
  driver:{container:'sgChatDriverQuick',input:'sgChatDriverInput',
   texts:['Bonjour, je suis disponible pour cette simulation.','Je suis en route (TEST).','Je suis arrivé dans la simulation.']}
 };
 const $=id=>document.getElementById(id);
 const enabled={client:false,driver:false};
 function use(role,index){
  const conf=config[role],field=conf&&$(conf.input);
  if(!conf||!enabled[role]||!field||field.disabled)return false;
  const sample=conf.texts[index];
  if(!sample)return false;
  const previous=(field.value||'').trim();
  const combined=previous?(previous+' '+sample):sample;
  if(combined.length>500){
   const status=$('sgChat'+(role==='client'?'Client':'Driver')+'Status');
   if(status)status.textContent='Message trop long : maximum 500 caractères.';
   return false;
  }
  field.value=combined;
  field.dispatchEvent?.(new Event('input',{bubbles:true}));
  field.focus?.();
  return true;
 }
 function setEnabled(role,value){
  if(!Object.prototype.hasOwnProperty.call(config,role))return;
  enabled[role]=!!value;
  const container=$(config[role].container);
  if(container)for(const btn of container.querySelectorAll('button'))
   btn.disabled=!enabled[role];
 }
 function mount(){
  for(const [role,conf] of Object.entries(config)){
   const box=$(conf.container);
   if(!box)return;
   box.replaceChildren();
   conf.texts.forEach((message,i)=>{
    const btn=document.createElement('button');
    btn.type='button';btn.className='alt sg-chat-quick-button';
    btn.textContent=message;
    btn.disabled=!enabled[role];
    btn.setAttribute('aria-label','Insérer sans envoyer : '+message);
    btn.addEventListener('click',()=>use(role,i));
    box.append(btn);
   });
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.sgQuickReplyTest={use,setEnabled,mount};
})();
