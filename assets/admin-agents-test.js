/* SAMGO TEST — administration des signalements anonymes et brouillons fiscaux.
   Aucun envoi d'e-mail / aucune sanction sans examen humain. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const escapeError=e=>e?.message||'Erreur réseau.';
const fmt=date=>date?new Date(date).toLocaleString('fr-FR'):'—';
const euros=cents=>(Number(cents)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
let processing=false,sessionSeq=0,access=null;
function authorized(){return !!access && access.isAdmin()===true;}
function requireAccess(){if(!authorized())throw Error('Accès administrateur requis.');return access;}
function label(el,name,value){
  const p=document.createElement('p');
  const strong=document.createElement('strong');
  strong.textContent=name+' : ';
  p.append(strong,document.createTextNode(String(value??'—')));
  el.appendChild(p);
}
function btn(labelText,handler){
  const el=document.createElement('button');el.type='button';el.className='alt';
  el.textContent=labelText;el.addEventListener('click',handler);return el;
}
async function privateRead(table,fields){
 const api=requireAccess(),t=await api.getToken();
 if(!t)throw Error('Session expirée.');
 const query=new URLSearchParams({select:fields,order:'cree_le.desc',limit:'100'});
 const rows=await api.request('/rest/v1/'+table+'?'+query,'GET',undefined,t);
 if(!Array.isArray(rows))throw Error('Réponse serveur inattendue.');
 return rows;
}
function empty(root,message){
 const div=document.createElement('p');div.className='empty';div.textContent=message;root.append(div);
}
function drawReports(rows){
 const root=$('sgAgentReports');root.replaceChildren();
 const urgent=rows.filter(x=>['danger','agression','accident'].includes(x.categorie)&&x.statut==='en_attente').length;
 $('sgAgentReportCount').textContent=rows.length+' dossier(s), dont '+urgent+' urgent(s) à examiner.';
 if(!rows.length)return empty(root,'Aucun signalement lié à une simulation de course.');
 const sorted=[...rows].sort((a,b)=>Number(['danger','agression','accident'].includes(b.categorie))-Number(['danger','agression','accident'].includes(a.categorie))||new Date(b.cree_le)-new Date(a.cree_le));
 sorted.forEach(item=>{
  const card=document.createElement('article');card.className='candidate';
  const heading=document.createElement('h3');
  heading.textContent=(['danger','agression','accident'].includes(item.categorie)?'🚨 PRIORITÉ — ':'')+'Dossier '+item.id.slice(0,8);
  card.append(heading);
  label(card,'Motif',item.categorie);
  label(card,'Date',fmt(item.cree_le));
  label(card,'Statut',item.statut);
  label(card,'Compte concerné (identifiant interne)',item.cible_id.slice(0,8));
  const p=document.createElement('p');p.textContent=item.details;card.append(p);
  const info=document.createElement('p');info.className='small';info.textContent='Confidentiel : ne pas divulguer le déclarant. L’avertissement n’est envoyé qu’après vérification et décision humaine.';card.append(info);
  if(item.statut==='en_attente'){
   const controls=document.createElement('div');controls.className='controls';
   controls.append(btn('Valider 1 avertissement TEST',()=>review(item,'avertissement_valide')));
   controls.append(btn('Rejeter le signalement',()=>review(item,'rejete')));
   card.append(controls);
  }
  root.append(card);
 });
}
function drawEscalations(rows){
 const root=$('sgAgentEscalations');root.replaceChildren();
 $('sgAgentEscCount').textContent=rows.filter(x=>x.statut!=='cloture').length+' dossier(s) à suivre.';
 if(!rows.length)return empty(root,'Aucune personne n’a atteint 3 avertissements validés.');
 rows.forEach(item=>{
  const card=document.createElement('article');card.className='candidate';
  const h=document.createElement('h3');h.textContent='🚨 Examen par le responsable SAMGO';card.append(h);
  label(card,'Compte concerné',item.cible_id.slice(0,8));
  label(card,'Avertissements validés',item.nombre_avertissements);
  label(card,'Statut',item.statut);
  const p=document.createElement('p');p.textContent='Une escalade ne suspend pas automatiquement la personne. Examen contradictoire et décision manuelle.';card.append(p);
  root.append(card);
 });
}
function drawInvoices(rows){
 const root=$('sgAgentInvoices');root.replaceChildren();
 $('sgAgentInvoiceCount').textContent=rows.length+' brouillon(s) TEST. Zéro facture fiscale émise.';
 if(!rows.length)return empty(root,'Aucun paiement Stripe TEST confirmé : aucun brouillon disponible.');
 rows.forEach(item=>{
  const card=document.createElement('article');card.className='candidate';
  const h=document.createElement('h3');h.textContent='Brouillon non fiscal — '+item.choix_id.slice(0,8);card.append(h);
  label(card,'Total fictif encaissé',euros(item.montant_ttc_centimes));
  label(card,'Commission SAMGO',euros(item.commission_centimes));
  label(card,'TVA',item.tva_regime==='a_confirmer'?'À DÉTERMINER — aucune taxe calculée':item.tva_regime);
  label(card,'État',item.statut);
  const p=document.createElement('p');p.className='small';p.textContent='Émission et e-mail désactivés : identité de l’émetteur, mandat de facturation, TVA, numérotation et cadre légal à valider.';card.append(p);
  root.append(card);
 });
}
async function load(){
 const revision=++sessionSeq;
 if(!authorized()){clear();return;}
 try{
  const [reports,escalations,invoices]=await Promise.all([
   privateRead('samgo_signalements_test','id,cible_id,categorie,details,statut,cree_le'),
   privateRead('samgo_escalades_test','id,cible_id,nombre_avertissements,statut,cree_le'),
   privateRead('samgo_factures_brouillons_test','id,choix_id,montant_ttc_centimes,commission_centimes,tva_regime,statut,cree_le')
  ]);
  if(revision!==sessionSeq||!authorized())return;
  drawReports(reports);drawEscalations(escalations);drawInvoices(invoices);
 }catch(error){
  if(revision!==sessionSeq)return;
  $('sgAgentReportCount').textContent='Impossible de charger les agents : '+escapeError(error);
 }
}
async function review(item,next){
 if(!authorized()||processing||item.statut!=='en_attente')return;
 if(!confirm(next==='avertissement_valide'?
  'Confirmer que les faits ont été examinés et valider UN avertissement TEST ? L’identité du déclarant ne sera jamais transmise.':
  'Rejeter ce signalement TEST sans avertissement ?'))return;
 processing=true;
 try{
  const api=requireAccess(),t=await api.getToken();if(!t)throw Error('Session expirée.');
  const query=new URLSearchParams({id:'eq.'+item.id,statut:'eq.en_attente'});
  const data=await api.request('/rest/v1/samgo_signalements_test?'+query,'PATCH',{statut:next,traite_le:new Date().toISOString()},t);
  if(!Array.isArray(data)||data.length!==1||data[0].statut!==next)throw Error('Le signalement a déjà changé de statut. Recharge la page.');
  api.notice('Décision TEST enregistrée. Notification uniquement dans le compte de la personne, sans nom de déclarant. Aucun e-mail envoyé.','good');
  await load();
 }catch(error){access?.notice(escapeError(error),'error');}
 finally{processing=false;}
}
function clear(){++sessionSeq;for(const id of ['sgAgentReports','sgAgentEscalations','sgAgentInvoices'])$(id)?.replaceChildren();}
window.sgAdminAgentsTest={load,clear,init:(api)=>{
 if(!api || typeof api.getToken!=='function' || typeof api.request!=='function' ||
  typeof api.notice!=='function' || typeof api.isAdmin!=='function')throw Error('Accès administrateur non fourni.');
 access=api;
}};
})();
