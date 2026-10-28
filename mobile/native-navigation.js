/* SAMGO TEST : navigation native Android, sans demande de permission ou de GPS.
 * Chargé seulement dans la WebView Capacitor, jamais sur le site public.
 */
(function(){
 'use strict';
 let registered=false;
 function install(){
  if(registered)return;
  const capacitor=window.Capacitor;
  if(!capacitor?.isNativePlatform?.())return;
  const plugin=capacitor.Plugins?.App;
  if(!plugin?.addListener)return;
  registered=true;
  try{
   const result=plugin.addListener('backButton',()=>{
    const menu=document.getElementById('sg-menu-panel');
    if(menu&&!menu.hasAttribute('hidden')){
     menu.setAttribute('hidden','');
     document.querySelector('.sg-menu-trigger')?.setAttribute('aria-expanded','false');
     return;
    }
    if(!document.body.classList.contains('sg-home-active')){
     if(typeof window.sgGo==='function')window.sgGo('home');
     else if(typeof sgGo==='function')sgGo('home');
     return;
    }
    if(typeof plugin.minimizeApp==='function')plugin.minimizeApp();
   });
   Promise.resolve(result).catch(()=>{registered=false;});
  }catch(_){registered=false;}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
