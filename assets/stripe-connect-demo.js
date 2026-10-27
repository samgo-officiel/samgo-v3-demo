/* SAMGO — simulation locale de la répartition Stripe Connect.
 * AUCUN paiement, appel Stripe, stockage de carte ou association bancaire.
 * Montants indicatifs seulement ; les frais, taxes et remboursements sont exclus.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const eur=cents=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(cents/100);
 function split(amountCents){
  if(!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>100000000){
   throw new RangeError('Montant de simulation invalide.');
  }
  // Politique de démonstration fixée dans index.html. Jamais un montant de confiance pour des paiements réels.
  const rate=Number(window.sgDemoCommissionPercent);
  if(rate!==0&&rate!==10)throw new Error('Politique de commission de test indisponible.');
  const platformCents=Math.round(amountCents*rate/100);
  return {amountCents,platformCents,driverCents:amountCents-platformCents,rate,feesIncluded:false,paymentCreated:false};
 }
 function current(){
  const km=$('km');
  if(!km)throw new Error('Distance de démonstration introuvable.');
  const dist=Number(km.value);
  if(!Number.isInteger(dist)||dist<1||dist>1000)throw new RangeError('Distance de simulation invalide.');
  // Hypothèse V1 seulement : 1 € / km. Un serveur devra fixer les vrais tarifs.
  return split(dist*100);
 }
 function render(){
  let calc;
  try{calc=current();}catch(err){
   const st=$('sgStripeDemoStatus');if(st)st.textContent=err.message;
   return;
  }
  const fields={sgStripeClient:eur(calc.amountCents),sgStripeDriver:eur(calc.driverCents),sgStripeSamgo:eur(calc.platformCents),sgStripeGainsDriver:eur(calc.driverCents)};
  Object.keys(fields).forEach(id=>{const node=$(id);if(node)node.textContent=fields[id];});
  const rates={sgStripeDriverRateLabel:'Chauffeur ('+(100-calc.rate)+' %)',sgStripeSamgoRateLabel:'SAMGO ('+calc.rate+' %)'};
  Object.entries(rates).forEach(([id,label])=>{const node=$(id);if(node)node.textContent=label;});
  return calc;
 }
 function simulate(){
  const calc=render();
  if(!calc)return;
  const state=$('sgStripeDemoStatus');
  if(state)state.textContent='✓ Répartition fictive calculée : '+eur(calc.amountCents)+' = '+eur(calc.driverCents)+' chauffeur + '+eur(calc.platformCents)+' SAMGO. Aucun paiement Stripe n’a été créé.';
 }
 function start(){
  const km=$('km');
  if(km)km.addEventListener('change',render);
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
 window.sgStripeDemo={split,render,simulate};
})();