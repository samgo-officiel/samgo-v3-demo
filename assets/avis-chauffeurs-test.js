/* SAMGO — avis et étoiles de démonstration, non publics et non vérifiés. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let clientSequence=0,driverSequence=0;
const reviewDrafts=new Map(); // Brouillons conservés uniquement dans cette page, jamais en base.
function signed(){return typeof sessionUser!=='undefined'&&!!sessionUser&&typeof client!=='undefined'&&!!client&&!!client.testChoices&&!!client.testReviews;}
function driverOk(){return signed()&&typeof driverSimAllowed!=='undefined'&&driverSimAllowed;}
function status(id,value){const el=$(id);if(el)el.textContent=value;}
function addText(box,tag,value,cls){
 const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;box.append(e);return e;
}
function addButton(box,title,action,cls){
 const e=document.createElement('button');e.type='button';e.textContent=title;
 if(cls)e.className=cls;e.addEventListener('click',action);box.append(e);return e;
}
function stars(value){const n=Math.min(5,Math.max(0,Number(value)||0));return '★'.repeat(n)+'☆'.repeat(5-n);}
function stepName(stage){
 const names={en_route_test:'Le chauffeur indique être en route (TEST)',arrive_test:'Le chauffeur indique être arrivé (TEST)',trajet_test:'Trajet fictif commencé (TEST)'};
 return names[stage]||'Chauffeur sélectionné (TEST)';
}
function renderTimeline(target,choice,track){
 const phaseNames=['Chauffeur choisi','En route','Arrivé','Trajet commencé','Terminé'];
 const stageMap={en_route_test:1,arrive_test:2,trajet_test:3};
 const current=choice.statut==='termine_test'?4:(track&&Object.prototype.hasOwnProperty.call(stageMap,track.etape)?stageMap[track.etape]:0);
 const wrap=document.createElement('div');wrap.className='sg-test-timeline';
 wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Progression de la course fictive');
 const heading=document.createElement('small');
 heading.textContent=choice.statut==='annule_test'?'Simulation annulée (aucune vraie course)':'Étapes de votre course fictive — TEST';
 wrap.append(heading);
 if(choice.statut==='annule_test')wrap.classList.add('cancelled');
 const steps=document.createElement('div');steps.className='sg-test-timeline-steps';
 phaseNames.forEach((label,i)=>{
  const item=document.createElement('div');item.className='sg-test-timeline-step';
  const active=choice.statut!=='annule_test'&&i<=current;
  if(active)item.classList.add('reached');
  if(choice.statut!=='annule_test'&&i===current)item.classList.add('current');
  const symbol=document.createElement('span');symbol.className='sg-test-timeline-icon';
  symbol.textContent=active?'✓':String(i+1);
  const caption=document.createElement('span');caption.textContent=label;
  item.append(symbol,caption);steps.append(item);
 });
 wrap.append(steps);target.append(wrap);
}
async function nextStage(choice,record){
 if(!driverOk())return;
 const next=record?({en_route_test:'arrive_test',arrive_test:'trajet_test'}[record.etape]):'en_route_test';
 if(!next)return;
 const result=record?await client.testTracking.advance(choice.id,record.etape,next):await client.testTracking.start(choice.id,sessionUser.id);
 if(result.error){status('sgDriverSelectionsStatus','Modification du suivi impossible : '+(result.error.message||'Réessayez.'));return;}
 await refreshDriver();
 status('sgDriverSelectionsStatus','✓ '+stepName(next)+'. Aucune vraie course commencée.');
}
function addReviewForm(box,choice){
 const form=document.createElement('div');form.className='sg-review-demo-card';
 addText(form,'strong','Donner une note au chauffeur — TEST');
 addText(form,'p','Évaluez la course fictive avec 1 à 5 étoiles. Cet avis ne devient pas une note réelle.', 'sg-demo-small');
 const buttons=document.createElement('div');buttons.className='sg-stars-picker';
 buttons.setAttribute('role','group');buttons.setAttribute('aria-label','Choisir le nombre d’étoiles');
 const previousDraft=reviewDrafts.get(choice.id)||{rating:0,comment:''};
 let selected=previousDraft.rating;const buttonNodes=[];
 for(let n=1;n<=5;n++){
  const item=document.createElement('button');item.type='button';
  item.textContent='☆';item.setAttribute('aria-label',n+' étoile'+(n>1?'s':''));
  item.setAttribute('aria-pressed','false');
  item.addEventListener('click',()=>{
   selected=n;
   reviewDrafts.set(choice.id,{rating:n,comment:comment.value});
   buttonNodes.forEach((s,i)=>{s.textContent=i<n?'★':'☆';s.setAttribute('aria-pressed',String(i===n-1));});
  });
  buttonNodes.push(item);buttons.append(item);
 }
 buttonNodes.forEach((star,i)=>{star.textContent=i<selected?'★':'☆';star.setAttribute('aria-pressed',String(i===selected-1));});
 form.append(buttons);
 const comment=document.createElement('textarea');comment.className='sg-review-comment';
 comment.maxLength=300;comment.rows=3;
 comment.placeholder='Commentaire facultatif (300 caractères maximum)';
 comment.setAttribute('aria-label','Commentaire sur la course fictive');
 comment.value=previousDraft.comment;
 comment.addEventListener('input',()=>reviewDrafts.set(choice.id,{rating:selected,comment:comment.value}));
 form.append(comment);
 const msg=addText(form,'p','Avis visible seulement par les participants du test.','sg-demo-small');
 msg.setAttribute('role','status');
 const submit=addButton(form,'Publier mon avis de TEST',async()=>{
  if(!signed())return;
  if(selected<1||selected>5){msg.textContent='Sélectionnez entre 1 et 5 étoiles.';return;}
  submit.disabled=true;msg.textContent='Enregistrement de la note de test…';
  const result=await client.testReviews.create(choice.id,sessionUser.id,choice.chauffeur_id,selected,comment.value.trim());
  if(result.error){msg.textContent='Erreur : '+(result.error.message||'Veuillez réessayer.');submit.disabled=false;return;}
  reviewDrafts.delete(choice.id);
  await refreshClient();
  status('sgReviewClientStatus','✓ Votre avis de '+selected+' étoile(s) a été enregistré en mode TEST.');
 },'sg-review-submit');
 box.append(form);
}
async function selectDriver(ad,answer){
 if(!signed())return;
 const result=await client.testChoices.choose(ad.id,answer.id,answer.chauffeur_id,sessionUser.id);
 if(result.error){status('sgReviewClientStatus','Impossible de sélectionner ce chauffeur : '+(result.error.message||'Réessayez.'));return;}
 await refreshClient();
 status('sgReviewClientStatus','✓ Chauffeur sélectionné en simulation. Aucune vraie course attribuée.');
}
async function cancelRide(choice){
 if(!signed())return;
 if(typeof window.confirm==='function'&&!window.confirm('Annuler cette simulation ? Elle ne sera plus proposée comme course fictive.'))return;
 const result=await client.testChoices.cancel(choice.id,sessionUser.id);
 if(result.error){status('sgReviewClientStatus','Annulation impossible : '+(result.error.message||'Réessayez.'));return;}
 await refreshClient();
 status('sgReviewClientStatus','✓ Simulation annulée. Aucune course réelle concernée.');
}
async function finishRide(choice){
 if(!signed())return;
 if(typeof window.confirm==='function'&&!window.confirm('Terminer la course fictive pour pouvoir déposer un avis de test ?'))return;
 const result=await client.testChoices.finish(choice.id,sessionUser.id);
 if(result.error){status('sgReviewClientStatus','Erreur de clôture : '+(result.error.message||'Réessayez.'));return;}
 await refreshClient();
 status('sgReviewClientStatus','✓ Simulation terminée. Vous pouvez noter le chauffeur avec les étoiles.');
}
async function refreshClient(){
 const list=$('sgReviewClientList');if(!list)return;
 list.replaceChildren();
 if(!signed()){status('sgReviewClientStatus','Connectez-vous pour choisir et noter un chauffeur de test.');return;}
 const uid=sessionUser.id,seq=++clientSequence;
 status('sgReviewClientStatus','Chargement des chauffeurs intéressés et avis de test…');
 try{
  const [a,r,c,v,t,p]=await Promise.all([
   client.testRequests.mine(uid),client.testReplies.list(),client.testChoices.list(),
   client.testReviews.list(),client.testTracking.list(),client.testPayments.list()
  ]);
  if(!signed()||uid!==sessionUser.id||seq!==clientSequence)return;
  for(const result of [a,r,c,v,t,p])if(result.error)throw result.error;
  const ads=Array.isArray(a.data)?a.data:[],replies=Array.isArray(r.data)?r.data:[],
        choices=Array.isArray(c.data)?c.data:[],reviews=Array.isArray(v.data)?v.data:[],
        tracking=Array.isArray(t.data)?t.data:[],payments=Array.isArray(p.data)?p.data:[];
  status('sgReviewClientStatus',ads.length?ads.length+' annonce(s) consultée(s) en version de test.':'Aucune annonce publiée pour ce compte.');
  for(const ad of ads){
   const card=document.createElement('article');card.className='sg-reply-card';
   addText(card,'strong',ad.depart_test+' → '+ad.destination_test);
   const relevant=replies.filter(x=>x.annonce_id===ad.id);
   const selected=choices.find(x=>x.annonce_id===ad.id&&x.client_id===uid);
   const active=ad.statut==='test_en_attente'&&Date.parse(ad.expire_le)>Date.now();
   addText(card,'p',relevant.length+' chauffeur(s) intéressé(s) (test).');
   if(selected){
    addText(card,'p',selected.statut==='termine_test'?'✓ Course fictive terminée':selected.statut==='annule_test'?'× Simulation annulée':'✓ Un chauffeur a été choisi pour cette simulation.');
    const step=tracking.find(x=>x.choix_id===selected.id);
    const payment=payments.find(x=>x.choix_id===selected.id);
    renderTimeline(card,selected,step);
    if(payment){
     const euros=(Number(payment.montant_centimes)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
     const paymentText=payment.statut==='paye_test'?'✓ Paiement Stripe SANDBOX confirmé (argent fictif)' :
      payment.statut==='checkout_ouvert'?'Paiement Stripe SANDBOX en attente de confirmation':
      payment.statut==='expire_test'?'Session Stripe de test expirée':'Paiement Stripe de test non abouti';
     addText(card,'p',paymentText+' · '+euros+' · Commission SAMGO : 0 %');
    }
    if(step)addText(card,'p',stepName(step.etape));
    else if(selected.statut==='choisi_test')addText(card,'p','En attente du premier statut du chauffeur (test).');
    if(selected.statut==='choisi_test'){
     addButton(card,'Terminer la simulation (test)',()=>finishRide(selected),'sg-demo-finish');
     addButton(card,'Annuler cette simulation (test)',()=>cancelRide(selected),'alt');
     if(window.sgStripeSandbox&&(!payment||payment.statut!=='paye_test'))
      addButton(card,'💳 Tester le paiement Stripe SANDBOX',()=>window.sgStripeSandbox.checkout(selected.id),'alt');
    }else if(selected.statut==='termine_test'){
     const review=reviews.find(x=>x.choix_id===selected.id);
     if(review){
      const view=document.createElement('div');view.className='sg-review-demo-card';
      addText(view,'strong',stars(review.note)+' · '+review.note+'/5 — Avis TEST');
      if(review.commentaire)addText(view,'p',review.commentaire);
      card.append(view);
     }else addReviewForm(card,selected);
    }
   }else if(active&&relevant.length){
    addText(card,'p','Choisissez un chauffeur intéressé pour essayer le parcours de notation.');
    relevant.forEach((answer,i)=>addButton(card,'Choisir chauffeur de test n°'+(i+1),()=>selectDriver(ad,answer),'sg-demo-select'));
   }else addText(card,'p',active?'En attente de réponses des chauffeurs de test.':'Annonce expirée : aucun nouveau choix possible.');
   list.append(card);
  }
 }catch(e){status('sgReviewClientStatus','Chargement impossible : '+(e.message||'Veuillez réessayer.'));}
}
async function refreshDriver(){
 const rlist=$('sgDriverReviewsList'),slist=$('sgDriverSelectionsList');
 if(!rlist||!slist)return;
 rlist.replaceChildren();slist.replaceChildren();
 if(!driverOk()){
  status('sgDriverReviewsStatus','Connectez-vous en tant que chauffeur approuvé (test).');
  status('sgDriverSelectionsStatus','Aucune sélection chargée.');
  const b=$('sgDriverRatingValue');if(b)b.textContent='—';return;
 }
 const uid=sessionUser.id,seq=++driverSequence;
 status('sgDriverReviewsStatus','Chargement de vos avis de test…');
 try{
  const [ch,rev,tracking,payments]=await Promise.all([
   client.testChoices.list(),client.testReviews.list(),client.testTracking.list(),client.testPayments.list()
  ]);
  if(!signed()||sessionUser.id!==uid||seq!==driverSequence)return;
  for(const req of [ch,rev,tracking,payments])if(req.error)throw req.error;
  const mine=(ch.data||[]).filter(c=>c.chauffeur_id===uid);
  const reviews=(rev.data||[]).filter(x=>x.chauffeur_id===uid);
  const avg=reviews.length?(reviews.reduce((sum,x)=>sum+Number(x.note),0)/reviews.length):0;
  const rating=$('sgDriverRatingValue');
  if(rating)rating.textContent=reviews.length?avg.toFixed(1).replace('.',',')+'★':'—';
  status('sgDriverReviewsStatus',reviews.length?reviews.length+' avis de test (non publics).':'Aucune étoile de test reçue pour le moment.');
  status('sgDriverSelectionsStatus',mine.length?mine.length+' client(s) vous ont choisi en simulation.':'Aucune course fictive sélectionnée.');
  for(const review of reviews){
   const card=document.createElement('div');card.className='sg-review-demo-card';
   addText(card,'strong',stars(review.note)+' · '+review.note+'/5 — TEST');
   if(review.commentaire)addText(card,'p',review.commentaire);
   rlist.append(card);
  }
  for(const selection of mine){
   const card=document.createElement('div');card.className='sg-review-demo-card';
   addText(card,'strong',selection.statut==='termine_test'?'Simulation terminée':selection.statut==='annule_test'?'Simulation annulée':'Chauffeur choisi (test)');
   const step=(tracking.data||[]).find(x=>x.choix_id===selection.id);
   const payment=(payments.data||[]).find(x=>x.choix_id===selection.id);
   renderTimeline(card,selection,step);
   if(payment)addText(card,'p',payment.statut==='paye_test'?
    '✓ Paiement fictif Stripe confirmé — SANDBOX, aucun gain réel':
    'Stripe SANDBOX : '+(payment.statut==='checkout_ouvert'?'paiement en attente':payment.statut==='expire_test'?'session expirée':'paiement non abouti'));
   addText(card,'p',step?stepName(step.etape):'En attente : chauffeur non parti (test).');
   if(selection.statut==='choisi_test'&&(!step||step.etape!=='trajet_test')){
    const label=!step?'Indiquer : en route (TEST)':step.etape==='en_route_test'?'Indiquer : arrivé (TEST)':'Indiquer : trajet commencé (TEST)';
    addButton(card,label,()=>nextStage(selection,step),'sg-demo-finish');
   }
   addText(card,'p','Aucune véritable course ni aucun déplacement n’est demandé.');
   slist.append(card);
  }
 }catch(e){status('sgDriverReviewsStatus','Impossible de lire les avis de test : '+(e.message||'réessayez.'));}
}
function clear(){
 clientSequence++;driverSequence++;reviewDrafts.clear();
 for(const id of ['sgReviewClientList','sgDriverReviewsList','sgDriverSelectionsList']){
  const el=$(id);if(el)el.replaceChildren();
 }
 const rating=$('sgDriverRatingValue');if(rating)rating.textContent='—';
}
if(window.sgDemand){
 const old=window.sgDemand.refreshClient;
 window.sgDemand.refreshClient=async function(){if(old)await old();await refreshClient();};
}
window.sgReviews={refreshClient,refreshDriver,clear};
})();