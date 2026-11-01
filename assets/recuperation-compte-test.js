/* SAMGO — Récupération de compte, démonstration uniquement.
   Aucun mot de passe, code de récupération ni jeton ne doit être journalisé.
   Les liens de récupération sont traités par Supabase Auth sur HTTPS. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const STORAGE='samgo_v3_recovery_pending';
  const BASE='https://tgwdycgwgfisuskxwkvk.supabase.co';
  const isPending=()=>{try{return sessionStorage.getItem(STORAGE)==='1';}catch(_){return false;}};
  function markCleared(){try{sessionStorage.removeItem(STORAGE);}catch(_){}}
  function make(tag,attributes={},label=''){
    const element=document.createElement(tag);
    for(const [key,value] of Object.entries(attributes)){
      if(key==='className')element.className=value;
      else if(key==='hidden')element.hidden=!!value;
      else element.setAttribute(key,value);
    }
    if(label)element.textContent=label;
    return element;
  }
  function status(id,msg){const node=$(id);if(node)node.textContent=msg;}
  let requestPanel,completion,requestButton;
  function render(){
    if(!completion)return;
    const pending=isPending();
    completion.hidden=!pending;
    const activeUser=typeof sessionUser!=='undefined'&&!!sessionUser;
    if(pending){
      const logged=$('loggedIn');
      if(logged)logged.classList.add('hidden');
      status('sgResetCompleteInfo',activeUser?
        'Lien reconnu. Choisissez votre nouveau mot de passe (8 caractères minimum).':
        'Validation du lien en cours… Si le compte ne se connecte pas, redemandez un lien.');
    }
    if(requestButton)requestButton.hidden=pending||activeUser;
    if(!pending&&requestPanel&&!requestPanel.hidden&&activeUser)closeRequest();
  }
  function openRequest(){
    const form=$('authForm');
    if(form)form.classList.add('hidden');
    if(requestButton)requestButton.hidden=true;
    if(requestPanel)requestPanel.hidden=false;
    const value=$('email')?.value||'';
    if($('sgResetEmail')){$('sgResetEmail').value=value;$('sgResetEmail').focus();}
  }
  function closeRequest(){
    if(requestPanel)requestPanel.hidden=true;
    if(!isPending()&&requestButton)requestButton.hidden=false;
    $('authForm')?.classList.remove('hidden');
  }
  async function requestReset(event){
    event.preventDefault();
    const email=$('sgResetEmail')?.value.trim();
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return;
    const submit=$('sgResetSubmit');
    submit.disabled=true;
    status('sgResetRequestInfo','Demande en cours…');
    try{
      const redirect=window.location.origin+window.location.pathname;
      const endpoint=BASE+'/auth/v1/recover?redirect_to='+encodeURIComponent(redirect);
      // Ne jamais bloquer indéfiniment l'interface si la 4G coupe.
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try{
        response=await fetch(endpoint,{
          method:'POST',cache:'no-store',signal:controller.signal,
          headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({email})
        });
      }finally{clearTimeout(timeout);}
      if(!response.ok){
        if(response.status===429)throw new Error('rate-limit');
        if(response.status===403)throw new Error('email-not-authorized');
        if(response.status>=500)throw new Error('email-server-error');
        throw new Error('recovery-error');
      }
      // Réponse identique, que le compte existe ou non.
      status('sgResetRequestInfo',"Si cette adresse possède un compte SAMGO, un e-mail de réinitialisation a été demandé. Vérifiez aussi les spams.");
    }catch(error){
      status('sgResetRequestInfo',error?.name==='AbortError'?
        'Le serveur ne répond pas. Un e-mail a peut-être été envoyé : vérifiez votre boîte et les spams avant de redemander un lien.':
        error.message==='rate-limit'?
        'Limite d’e-mails SAMGO atteinte. Aucun nouveau lien n’a été envoyé pour cette tentative. Réessayez plus tard.':
        error.message==='email-not-authorized'?
        'Le service e-mail SAMGO TEST ne peut pas envoyer de lien vers cette adresse. Un SMTP externe peut être nécessaire.':
        error.message==='email-server-error'?
        'Le serveur d’envoi d’e-mails SAMGO ne répond pas correctement. Réessayez plus tard après vérification du SMTP.':
        'Impossible de demander le lien pour le moment. Vérifiez la connexion Internet ou réessayez plus tard.');
    }finally{submit.disabled=false;}
  }
  const CONFIRM_COOLDOWN='samgo_v3_confirm_next_attempt';
  function cooldownSeconds(){
    try{return Math.max(0,Math.ceil((Number(sessionStorage.getItem(CONFIRM_COOLDOWN)||0)-Date.now())/1000));}
    catch(_){return 0;}
  }
  // Renvoi explicitement demandé par l'utilisateur, jamais automatique à l'ouverture du site.
  async function resendConfirmation(){
    const address=$('email')?.value.trim()||'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){
      status('sgResendConfirmationStatus','Saisissez votre adresse e-mail complète dans le formulaire ci-dessus.');
      $('email')?.focus();
      return;
    }
    if(typeof navigator!=='undefined'&&navigator.onLine===false){
      status('sgResendConfirmationStatus','Vous êtes hors connexion. Réessayez quand Internet sera rétabli.');
      return;
    }
    const delay=cooldownSeconds();
    if(delay){
      status('sgResendConfirmationStatus','Un renvoi vient d’être demandé. Attendez encore '+delay+' secondes avant de réessayer.');
      return;
    }
    const button=$('sgResendConfirmation');
    if(!button||button.disabled)return;
    button.disabled=true;
    status('sgResendConfirmationStatus','Demande de renvoi en cours…');
    try{
      const confirmRedirect=window.location.origin+window.location.pathname;
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try{
        response=await fetch(BASE+'/auth/v1/resend?redirect_to='+encodeURIComponent(confirmRedirect),{
          method:'POST',cache:'no-store',signal:controller.signal,
          headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},
          body:JSON.stringify({type:'signup',email:address})
        });
      }finally{clearTimeout(timeout);}
      if(!response.ok){
        if(response.status===429)throw new Error('email-rate-limit');
        if(response.status===403||response.status===422)throw new Error('email-not-authorized');
        throw new Error('email-server-error');
      }
      try{sessionStorage.setItem(CONFIRM_COOLDOWN,String(Date.now()+60000));}catch(_){}
      // Réponse neutre : ni l'existence du compte ni la livraison ne sont garanties.
      status('sgResendConfirmationStatus',"Demande prise en compte. Si ce compte attend une confirmation, un nouveau lien a été demandé. Vérifiez aussi vos spams. Patientez au moins une minute avant un autre essai.");
    }catch(error){
      status('sgResendConfirmationStatus',error?.name==='AbortError'?
        "La connexion a expiré : le message a peut-être été envoyé. Vérifiez vos e-mails avant de réessayer.":
        error.message==='email-rate-limit'?
        "Limite d’envoi atteinte. Aucun nouvel e-mail n’a été envoyé pour cette tentative. Réessayez plus tard.":
        error.message==='email-not-authorized'?
        "L’envoi d’e-mails SAMGO TEST n’est pas encore disponible pour cette adresse. Le service SMTP doit être configuré.":
        "Impossible de demander le renvoi pour le moment. Réessayez plus tard.");
    }finally{button.disabled=false;}
  }
  async function changePassword(event){
    event.preventDefault();
    if(!isPending())return;
    const password=$('sgResetNew')?.value||'';
    if(password.length<8){status('sgResetCompleteStatus','Utilisez au moins 8 caractères.');return;}
    if(password!==$('sgResetConfirm')?.value){
      status('sgResetCompleteStatus','Les mots de passe ne correspondent pas.');return;
    }
    const submit=$('sgResetSave');submit.disabled=true;
    status('sgResetCompleteStatus','Enregistrement sécurisé…');
    try{
      const token=await client?.auth?.getAccessToken?.();
      if(!token)throw new Error('not-authorized');
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try{
        response=await fetch(BASE+'/auth/v1/user',{
          method:'PUT',cache:'no-store',signal:controller.signal,
          headers:{apikey:PUBLISHABLE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          body:JSON.stringify({password})
        });
      }finally{clearTimeout(timeout);}
      if(!response.ok)throw new Error(response.status===401?'not-authorized':'update-error');
      $('sgResetNew').value='';$('sgResetConfirm').value='';
      markCleared();
      completion.hidden=true;
      status('authStatus','Mot de passe mis à jour. Vous êtes connecté à SAMGO TEST.');
      if(typeof refreshUser==='function')await refreshUser();
      render();
    }catch(error){
      status('sgResetCompleteStatus',error?.name==='AbortError'?
        'Réponse trop lente. Le mot de passe a peut-être été modifié : vérifiez votre connexion avant de refaire une demande.':
        error.message==='not-authorized'?
        'Lien expiré ou session déconnectée. Demandez un nouveau lien.':
        'Impossible de changer le mot de passe. Réessayez ou demandez un nouveau lien.');
    }finally{submit.disabled=false;}
  }
  async function cancelRecovery(){
    markCleared();
    $('sgResetNew').value='';$('sgResetConfirm').value='';
    completion.hidden=true;
    if(typeof signOut==='function')await signOut();
    render();
  }
  function mount(){
    const loggedOut=$('loggedOut'),panel=$('authPanel'),form=$('authForm');
    if(!loggedOut||!panel||!form)return;
    requestButton=make('button',{type:'button',id:'sgResetOpen',className:'alt'},'Mot de passe oublié ?');
    requestButton.style.cssText='width:100%;margin:12px 0;background:#273844;color:#ffe0a0;';
    requestButton.addEventListener('click',openRequest);
    loggedOut.append(requestButton);
    const resendButton=make('button',{type:'button',id:'sgResendConfirmation',className:'alt'},'Renvoyer mon e-mail de confirmation');
    resendButton.style.cssText='width:100%;margin:5px 0;background:#273844;color:#ffe0a0;';
    resendButton.addEventListener('click',resendConfirmation);
    const resendStatus=make('p',{id:'sgResendConfirmationStatus',role:'status','aria-live':'polite'});
    loggedOut.append(resendButton,resendStatus);
    requestPanel=make('section',{id:'sgResetRequestPanel',hidden:true,className:'sg-auth-recovery'});
    requestPanel.style.cssText='margin:15px 0;padding:15px;border:1px solid #635b44;border-radius:15px;background:#172730;';
    const h=make('h3',{},'Retrouver mon compte');
    const p=make('p',{},'Entrez votre adresse e-mail. Vous recevrez un lien pour choisir un nouveau mot de passe.');
    const reqForm=make('form');
    const label=make('label',{for:'sgResetEmail'},'Adresse e-mail');
    const email=make('input',{type:'email',id:'sgResetEmail',autocomplete:'email',required:'',maxlength:'254',placeholder:'nom@exemple.fr'});
    const btn=make('button',{type:'submit',id:'sgResetSubmit'},'Envoyer un lien de réinitialisation');
    const back=make('button',{type:'button',className:'alt'},'Retour à la connexion');
    back.addEventListener('click',closeRequest);
    const info=make('p',{id:'sgResetRequestInfo',role:'status','aria-live':'polite'});
    reqForm.append(label,email,btn);
    reqForm.addEventListener('submit',requestReset);
    requestPanel.append(h,p,reqForm,back,info);
    loggedOut.append(requestPanel);
    completion=make('section',{id:'sgResetCompletePanel',hidden:true,className:'sg-auth-recovery'});
    completion.style.cssText='padding:16px;border:1px solid #8d7341;background:#182b34;border-radius:15px;margin:12px 0;';
    const title=make('h3',{},'Choisir un nouveau mot de passe');
    const description=make('p',{id:'sgResetCompleteInfo'},'Lien de récupération en cours de validation.');
    const passForm=make('form');
    const newLabel=make('label',{for:'sgResetNew'},'Nouveau mot de passe');
    const newPassword=make('input',{id:'sgResetNew',type:'password',autocomplete:'new-password',minlength:'8',required:''});
    const confirmLabel=make('label',{for:'sgResetConfirm'},'Confirmer le mot de passe');
    const confirm=make('input',{id:'sgResetConfirm',type:'password',autocomplete:'new-password',minlength:'8',required:''});
    const save=make('button',{type:'submit',id:'sgResetSave'},'Enregistrer mon mot de passe');
    passForm.append(newLabel,newPassword,confirmLabel,confirm,save);
    passForm.addEventListener('submit',changePassword);
    const cancel=make('button',{type:'button',className:'alt'},'Annuler et me déconnecter');
    cancel.addEventListener('click',cancelRecovery);
    const result=make('p',{id:'sgResetCompleteStatus',role:'status','aria-live':'polite'});
    completion.append(title,description,passForm,cancel,result);
    panel.insertBefore(completion,$('authStatus'));
    const params=new URLSearchParams(window.location.hash.slice(1));
    if(params.get('error_code')||params.get('error_description')){
      status('authStatus','Lien de confirmation ou de récupération invalide ou expiré. Redemandez un lien.');
      try{history.replaceState(history.state,'',location.pathname+location.search);}catch(_){}
    }
    render();
    // Un retour depuis Gmail atterrit sur l'accueil : afficher directement le formulaire de récupération.
    if(isPending()){
      if(typeof sgGo==='function')sgGo('account');
      const passwordField=$('sgResetNew');
      if(passwordField)passwordField.focus();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  window.sgAccountRecovery={render,isPending};
})();