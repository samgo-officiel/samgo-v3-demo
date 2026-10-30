/* SAMGO V2 — diagnostic volontaire du parcours d'une simulation.
 * Aucune position, donnée personnelle ou jeton n'est affiché ou conservé.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let seq=0,checking=false;
 function show(text){const el=$('sgJourneyStatus');if(el)el.textContent=text;}
 function ready(){
  return typeof sessionUser!=='undefined'&&!!sessionUser?.id&&
   typeof client!=='undefined'&&!!client?.testRequests&&!!client?.testReplies&&!!client?.testChoices;
 }
 function clear(){
  ++seq;checking=false;
  const b=$('sgJourneyCheck');if(b)b.disabled=false;
  show('Connectez-vous puis appuyez sur « Vérifier mon parcours TEST ».');
 }
 async function check(){
  if(checking)return;
  if(!ready()){
   show('Vous n’êtes pas connecté. Ouvrez Compte → Déjà inscrit pour accéder à vos annonces, puis relancez la vérification.');
   return;
  }
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
   show('Hors connexion : impossible de vérifier le serveur. Vos simulations locales ne sont pas des annonces publiées.');
   return;
  }
  const uid=sessionUser.id,run=++seq;
  const b=$('sgJourneyCheck');if(b)b.disabled=true;
  checking=true;
  show('Vérification sécurisée de vos annonces et des réponses de chauffeurs…');
  try{
   const [a,r,c]=await Promise.all([
    client.testRequests.mine(uid),client.testReplies.list(),client.testChoices.list()
   ]);
   if(run!==seq||!ready()||sessionUser.id!==uid)return;
   for(const result of [a,r,c])if(result.error)throw result.error;
   const ads=Array.isArray(a.data)?a.data:[];
   const replies=Array.isArray(r.data)?r.data:[];
   const choices=Array.isArray(c.data)?c.data:[];
   const owned=new Set(ads.map(x=>x.id));
   const mine=choices.filter(x=>x.client_id===uid&&owned.has(x.annonce_id));
   const chosen=mine.find(x=>x.statut==='choisi_test');
   const finished=mine.find(x=>x.statut==='termine_test');
   const active=ads.filter(x=>x.statut==='test_en_attente'&&Date.parse(x.expire_le)>Date.now());
   const interested=replies.filter(x=>owned.has(x.annonce_id));
   if(chosen){
    show('✓ Chauffeur sélectionné en TEST. Vous pouvez maintenant utiliser la messagerie plus bas sur cette page. Aucune vraie course n’est créée.');
   }else if(active.some(ad=>!mine.some(x=>x.annonce_id===ad.id))&&interested.some(x=>active.some(ad=>ad.id===x.annonce_id))){
    show('✓ Réponse chauffeur reçue. Descendez jusqu’à « Choisir et noter un chauffeur (TEST) », puis choisissez le chauffeur pour débloquer le chat.');
   }else if(active.length){
    const ownDriver=typeof driverSimAllowed!=='undefined'&&driverSimAllowed;
    show('✓ '+active.length+' annonce(s) TEST active(s), en attente de chauffeur. Sur un autre compte chauffeur approuvé, ouvrez « Chauffeur → Missions » et activez le GPS. '+
     (ownDriver?'Ce compte est aussi chauffeur : il ne peut pas répondre à sa propre annonce.':'La messagerie s’ouvrira seulement après la sélection d’un chauffeur.'));
   }else if(finished){
    show('✓ Une simulation est terminée. Descendez jusqu’aux avis pour noter votre chauffeur fictif, ou publiez une nouvelle annonce TEST.');
   }else if(ads.length){
    show('Vos annonces précédentes ont expiré ou ont été annulées. Ouvrez « Réserver » pour publier une nouvelle annonce TEST.');
   }else{
    show('Aucune annonce TEST publiée depuis ce compte. Une simulation locale ne suffit pas : ouvrez « Réserver », créez un trajet fictif, puis publiez la demande avec votre consentement GPS.');
   }
  }catch(_){
   if(run===seq&&ready()&&sessionUser.id===uid)
    show('Impossible de vérifier le parcours sur le serveur. Vérifiez Internet et réessayez. Vos données existantes ne sont pas effacées.');
  }finally{
   if(run===seq){checking=false;if(b)b.disabled=false;}
  }
 }
 if(typeof client!=='undefined'&&client?.auth?.onAuthStateChange){
  client.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'||event==='SIGNED_IN')clear();
  });
 }
 window.sgJourneyV2={check,clear};
})();