/* SAMGO V3 — installation facultative de la PWA de TEST.
   Cette fonction ne publie PAS d'application native et n'active aucun paiement ni push. */
(function(){
  'use strict';
  let deferredPrompt=null;
  const $=id=>document.getElementById(id);
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches===true||
    window.navigator.standalone===true;
  const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function say(value){
    const el=$('sgMobileInstallStatus');if(el)el.textContent=value;
  }
  function ready(){
    const area=$('sgMobileInstall');
    if(!area)return;
    if(standalone()){
      area.hidden=true;
      return;
    }
    area.hidden=false;
    say('Installez seulement la version de démonstration. Aucune course réelle.');
  }
  function instructions(){
    const box=$('sgMobileInstallInstructions');
    if(!box)return;
    box.hidden=false;
    box.replaceChildren();
    const li=(value)=>{
      const item=document.createElement('li');
      item.textContent=value;
      list.append(item);
    };
    const list=document.createElement('ol');
    if(ios()){
      const isSafari=/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
      li(isSafari?'Dans Safari, touchez le bouton Partager.':'Ouvrez d’abord cette page dans Safari sur votre iPhone.');
      li('Choisissez « Sur l’écran d’accueil » (ou « Ajouter à l’écran d’accueil »).');
      li('Confirmez « Ajouter » : l’icône SAMGO TEST apparaîtra sur votre écran.');
    }else if(/Android/i.test(navigator.userAgent)){
      li('Dans Chrome, ouvrez le menu ⋮.');
      li('Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil » si proposé.');
      li('Confirmez et ouvrez SAMGO depuis son icône.');
    }else{
      li('Ouvrez cette page dans Chrome, Edge ou un navigateur compatible.');
      li('Cherchez « Installer » dans la barre d’adresse ou le menu du navigateur.');
      li('Confirmez l’installation de SAMGO TEST.');
    }
    box.append(list);
    say('Cette installation crée un raccourci ou une application web, pas une application App Store/Google Play.');
  }
  async function install(){
    if(standalone()){say('SAMGO est déjà ouvert depuis l’écran d’accueil.');return;}
    if(deferredPrompt){
      const event=deferredPrompt;
      deferredPrompt=null;
      try{
        event.prompt();
        const result=await event.userChoice;
        if(result?.outcome==='accepted')say('Installation acceptée. Retrouvez SAMGO sur votre appareil.');
        else{say('Installation annulée. Vous pouvez réessayer depuis le navigateur.');instructions();}
      }catch(_){instructions();}
    }else instructions();
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    ready();
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    const area=$('sgMobileInstall');if(area)area.hidden=true;
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
  window.sgInstallTest={install,instructions};
})();