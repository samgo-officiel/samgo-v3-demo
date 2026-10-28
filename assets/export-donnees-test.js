/* SAMGO TEST — export local partiel des données du compte connecté.
 * Aucun mot de passe, token de session, GPS précis, permis, RIB ou pièce d'identité.
 * Le fichier ne quitte le navigateur qu'à la demande explicite de l'utilisateur.
 * Les méthodes de liste actuellement limitées ne garantissent pas une extraction RGPD complète.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let revision=0,busy=false;
function signed(){
 return typeof sessionUser!=='undefined'&&!!sessionUser?.id&&
  typeof client!=='undefined'&&!!client?.testRequests?.mine;
}
const pick=(row,fields)=>{
 const record={};
 for(const key of fields)
  if(row&&Object.prototype.hasOwnProperty.call(row,key)&&
    (['string','number','boolean'].includes(typeof row[key])||row[key]===null))
   record[key]=row[key];
 return record;
};
async function request(label,task,notes){
 try{
  const result=await task();
  if(result?.error)throw result.error;
  return Array.isArray(result?.data)?result.data:[];
 }catch(_){
  notes.push(label+' : lecture indisponible');
  return [];
 }
}
function eligibleChoice(row,userId){
 return row&&(row.client_id===userId||row.chauffeur_id===userId);
}
async function collect(userId,active){
 const notes=[];
 const [adsAll,choicesAll,reviewsAll,trackingAll,paymentsAll]=await Promise.all([
  request('Annonces',()=>client.testRequests.mine(userId),notes),
  request('Simulations',()=>client.testChoices.list(),notes),
  request('Avis',()=>client.testReviews.list(),notes),
  request('Étapes',()=>client.testTracking.list(),notes),
  request('Paiements TEST',()=>client.testPayments.list(),notes)
 ]);
 if(!active())return null;
 const ads=adsAll.filter(r=>r.client_id===userId||r.utilisateur_id===userId||
  (!r.client_id&&!r.utilisateur_id));
 const choices=choicesAll.filter(r=>eligibleChoice(r,userId));
 const ids=new Set(choices.map(r=>r.id).filter(Boolean));
 const messages=[];
 for(const choice of choices.slice(0,20)){
  if(!active())return null;
  const rows=await request('Messages de simulation '+String(choice.id).slice(0,8),
   ()=>client.testMessages.list(choice.id),notes);
  if(!active())return null;
  for(const r of rows)
   if(r.choix_id===choice.id)
    messages.push(pick(r,['id','choix_id','auteur_id','contenu','cree_le']));
 }
 return {
  avertissement:'EXPORT PARTIEL DE SAMGO TEST, aucune course réelle. Les résultats sont limités par les listes de l’application et ne constituent pas une réponse complète à une demande RGPD.',
  exporte_le:new Date().toISOString(),
  compte:{id:userId},
  annonces:ads.map(r=>pick(r,['id','client_id','utilisateur_id','depart_test','destination_test','distance_km','tarif_indicatif','statut','cree_le','expire_le'])),
  simulations:choices.map(r=>pick(r,['id','annonce_id','client_id','chauffeur_id','statut','cree_le','modifie_le'])),
  messages,
  avis:reviewsAll.filter(r=>ids.has(r.choix_id)).map(r=>pick(r,['id','choix_id','client_id','chauffeur_id','note','commentaire','cree_le'])),
  etapes:trackingAll.filter(r=>ids.has(r.choix_id)).map(r=>pick(r,['choix_id','etape','cree_le','modifie_le'])),
  paiements_fictifs:paymentsAll.filter(r=>ids.has(r.choix_id)).map(r=>pick(r,['choix_id','montant_centimes','commission_centimes','statut','modifie_le'])),
  limites:notes
 };
}
function status(text){const node=$('sgMyDataStatus');if(node)node.textContent=text;}
async function exportFile(){
 if(busy)return false;
 if(!signed()){status('Connectez-vous pour exporter vos données de test.');return false;}
 const uid=sessionUser.id,token=revision;
 const active=()=>token===revision&&signed()&&sessionUser.id===uid;
 busy=true;
 const button=$('sgMyDataExport');
 if(button)button.disabled=true;
 status('Préparation de votre export partiel de TEST…');
 try{
  const data=await collect(uid,active);
  if(!active()||!data)return false;
  const json=JSON.stringify(data,null,2);
  // Le téléchargement par Blob est volontaire ; les données ne sont jamais
  // publiées sur un serveur de partage.
  const isNative=window.Capacitor?.isNativePlatform?.()===true;
  if(isNative){
   const copy=window.navigator?.clipboard?.writeText||navigator.clipboard?.writeText;
   if(typeof copy==='function'){
    try{
     await copy.call(window.navigator?.clipboard||navigator.clipboard,json);
     if(active())status('Export partiel TEST copié dans le presse-papiers. Collez-le dans un espace personnel sécurisé.');
     return active();
    }catch(_){/* Certains appareils interdisent l'accès au presse-papiers WebView. */}
   }
   if(!active())return false;
   const manual=$('sgMyDataManual'),textarea=$('sgMyDataManualJson');
   if(manual&&textarea){
    textarea.value=json;
    manual.hidden=false;
    status('Copie automatique indisponible : sélectionnez le texte ci-dessous pour le copier manuellement. Effacé à la déconnexion.');
    return true;
   }
   status('Export disponible depuis le navigateur Web SAMGO, où le fichier JSON peut être téléchargé.');
   return false;
  }
  const blob=new Blob([json],{type:'application/json;charset=utf-8'});
  const link=document.createElement('a');
  const objectUrl=URL.createObjectURL(blob);
  try{
   link.href=objectUrl;
   link.download='samgo-donnees-test.json';
   link.hidden=true;
   document.body.append(link);
   link.click();
   if(active())status('Export partiel de TEST téléchargé. Gardez ce fichier privé.');
   return active();
  }finally{
   link.remove?.();
   // Un délai est nécessaire sur certains Safari mobiles pour terminer le téléchargement.
   if(typeof setTimeout==='function')setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);
   else URL.revokeObjectURL(objectUrl);
  }
 }catch(_){
  if(active())status('Export indisponible pour le moment. Réessayez en restant connecté.');
  return false;
 }finally{
  if(token===revision){busy=false;if(button)button.disabled=false;}
 }
}
function reset(){
 revision++;
 const manual=$('sgMyDataManual'),textarea=$('sgMyDataManualJson');
 if(textarea)textarea.value='';
 if(manual)manual.hidden=true;
 busy=false;
 const button=$('sgMyDataExport');if(button)button.disabled=false;
 status('Connectez-vous pour exporter vos données de test.');
}
window.sgMyDataTest={exportFile,reset,collect,eligibleChoice};
})();