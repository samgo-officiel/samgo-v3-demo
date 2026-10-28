'use strict';
/* SAMGO TEST — lecture limitée des indications de dépôt du coffre privé.
 * Pas de téléchargement de documents, pas d'upload, pas de coordonnées bancaires.
 * Un fichier présent n'est JAMAIS une identité ou un permis validé.
 */
(function(){
  const BUCKET='samgo-driver-documents';
  const DOC_TYPES={permis:'sgDocsPermis',domicile:'sgDocsDomicile',selfie:'sgDocsSelfie'};
  let candidate=false,version=0,pending=false;

  function element(id){return document.getElementById(id);}
  function userId(){
    return (typeof sessionUser!=='undefined' && sessionUser && sessionUser.id) || null;
  }
  function currentClient(){
    return (typeof client!=='undefined' && client) || null;
  }
  function status(message){
    const node=element('sgDocsStatus');
    if(node)node.textContent=message;
  }
  function clearStatuses(){
    for(const id of Object.values(DOC_TYPES)){
      const node=element(id);
      if(node)node.textContent='Non contrôlé';
    }
  }
  function validId(value){
    return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
  function reset(){
    version++;pending=false;candidate=false;clearStatuses();
    status('Coffre non consulté. Aucune vérification d’identité active.');
    const button=element('sgDocsInspect');
    if(button)button.disabled=true;
  }
  function setCandidate(value){
    const enabled=Boolean(value&&userId());
    if(candidate!==enabled){
      version++;pending=false;clearStatuses();
      status(enabled?'Dossier TEST : consultez seulement l’état des dépôts fictifs.':'Déposez d’abord une candidature de test.');
    }
    candidate=enabled;
    const button=element('sgDocsInspect');
    if(button)button.disabled=!candidate;
  }
  async function listOwnDocs(uid,type,token){
    const endpoint=SUPABASE_URL+'/storage/v1/object/list/'+BUCKET;
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({prefix:uid+'/'+type+'/',limit:10,offset:0}),
      cache:'no-store'
    });
    if(!response.ok)throw new Error('Accès au coffre indisponible (HTTP '+response.status+').');
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('Réponse de stockage invalide.');
    // Existence uniquement, jamais le contenu ou le nom du fichier sur la page.
    return data.some(row=>row && row.name==='document');
  }
  async function inspect(){
    const uid=userId(),api=currentClient();
    if(!candidate||!validId(uid)||!api?.auth?.getAccessToken){
      status('Connectez un compte avec une candidature chauffeur TEST.');
      return;
    }
    if(pending)return;
    const request=++version;
    const stillCurrent=()=>version===request&&candidate&&userId()===uid;
    pending=true;
    const button=element('sgDocsInspect');
    if(button)button.disabled=true;
    status('Consultation privée en cours…');
    try{
      const token=await api.auth.getAccessToken();
      if(!stillCurrent())return;
      if(!token)throw new Error('Session expirée : reconnectez-vous.');
      const entries=await Promise.all(Object.keys(DOC_TYPES).map(async type=>[type,await listOwnDocs(uid,type,token)]));
      if(!stillCurrent())return;
      for(const [type,present] of entries){
        const node=element(DOC_TYPES[type]);
        if(node)node.textContent=present?'Dépôt détecté — NON VÉRIFIÉ':'Aucun dépôt';
      }
      status('État du stockage chargé. Aucun document n’a été ouvert, téléchargé ou validé.');
    }catch(error){
      if(!stillCurrent())return;
      clearStatuses();
      status(error?.message||'Impossible de consulter le coffre privé.');
    }finally{
      if(stillCurrent()){
        pending=false;
        if(button)button.disabled=false;
      }
    }
  }
  window.sgDriverDocsTest={setCandidate,inspect,reset};
})();
