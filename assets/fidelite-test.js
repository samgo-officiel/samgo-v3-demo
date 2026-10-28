/* SAMGO — Carte de fidélité de démonstration, sans récompense réelle.
 * Le compteur provient uniquement des choix de test terminés pour le compte client.
 * Aucun coupon, réduction, avoir, frais ni paiement n'est émis par ce module.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const STEP=10;
 let sequence=0;
 const signed=()=>typeof sessionUser!=='undefined'&&!!sessionUser&&
   typeof client!=='undefined'&&!!client?.testChoices;
 function show(total){
   const progress=$('sgLoyaltyProgress'),count=$('sgLoyaltyCount'),message=$('sgLoyaltyStatus');
   if(!progress||!count||!message)return;
   const n=Math.max(0,Number(total)||0);
   const cycle=n===0?0:((n-1)%STEP)+1;
   const complete=Math.floor(n/STEP);
   progress.max=STEP;progress.value=cycle;
   count.textContent=cycle+' / '+STEP+' trajets fictifs';
   message.textContent=n===0?
     'Aucune simulation terminée sur ce compte. Seuls les tests terminés sont comptabilisés.':
     n+' simulation(s) terminée(s) en tout. '+(complete?
       complete+' cycle(s) de 10 atteints en démonstration. ':'')+
       'La récompense réelle et ses conditions ne sont pas encore définies.';
 }
 async function refresh(){
   const target=$('sgLoyaltyStatus');
   if(!target)return;
   const current=++sequence;
   if(!signed()){
     show(0);target.textContent='Connectez-vous en tant que client de test pour voir votre progression fictive.';
     return;
   }
   const uid=sessionUser.id;
   target.textContent='Vérification de la progression de test…';
   try{
     const result=await client.testChoices.list();
     if(current!==sequence||!signed()||sessionUser.id!==uid)return;
     if(result.error)throw result.error;
     const rows=Array.isArray(result.data)?result.data:[];
     const count=rows.filter(row=>row.client_id===uid&&row.statut==='termine_test').length;
     show(count);
     if(rows.length>=100){
       target.textContent+=' Historique limité aux 100 choix récents : ce total peut être incomplet.';
     }
   }catch(_){
     if(current===sequence)target.textContent='Progression indisponible. Réessayez lorsque la connexion fonctionne.';
   }
 }
 function stop(){
   ++sequence;show(0);
   const target=$('sgLoyaltyStatus');
   if(target)target.textContent='Connectez-vous pour voir les simulations de fidélité.';
 }
 window.sgLoyaltyTest={refresh,stop};
})();