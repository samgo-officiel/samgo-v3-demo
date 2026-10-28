/* SAMGO TEST — préférences non sensibles du chauffeur, enregistrées localement.
 * Uniquement rayon et tri, aucune position, aucun compte ni adresse stockée.
 */
(function(){
 'use strict';
 const RADIUS='samgo-test-radius-v1',SORT='samgo-test-sort-v1';
 const allowedRadii=new Set(['5','10','20','30','50']);
 const allowedSorts=new Set(['proximite','tarif','trajet']);
 const get=id=>document.getElementById(id);
 function safeRead(key){try{return localStorage.getItem(key);}catch(_){return null;}}
 function safeWrite(key,value){try{localStorage.setItem(key,value);return true;}catch(_){return false;}}
 function safeDelete(key){try{localStorage.removeItem(key);}catch(_){}}
 function restore(){
  const radius=get('sgRadius'),sort=get('sgDemandSort');
  if(radius){
   const saved=safeRead(RADIUS);
   if(allowedRadii.has(saved))radius.value=saved;
   const summary=get('sgRadiusValue');
   if(summary)summary.textContent=radius.value+' km';
  }
  if(sort){
   const saved=safeRead(SORT);
   if(allowedSorts.has(saved))sort.value=saved;
  }
 }
 function save(){
  const r=get('sgRadius')?.value,s=get('sgDemandSort')?.value;
  if(allowedRadii.has(r))safeWrite(RADIUS,r);
  if(allowedSorts.has(s))safeWrite(SORT,s);
 }
 function reset(){
  safeDelete(RADIUS);safeDelete(SORT);
  const r=get('sgRadius'),s=get('sgDemandSort'),q=get('sgDemandTextFilter');
  if(r)r.value='30';if(s)s.value='proximite';if(q)q.value='';
  const summary=get('sgRadiusValue');if(summary)summary.textContent='30 km';
  // Un changement volontaire de rayon peut relancer la recherche déjà active.
  window.sgDemand?.radiusChanged?.();
  window.sgDemand?.sortChanged?.();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});
 else restore();
 window.sgDriverPrefs={save,restore,reset};
})();
