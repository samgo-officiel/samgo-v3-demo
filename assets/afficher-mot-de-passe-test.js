/* SAMGO TEST — visibilité volontaire du mot de passe, sans stockage. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function update(visible){
  const field=$('password'),button=$('sgPasswordToggle');
  if(!field||!button)return false;
  field.type=visible?'text':'password';
  button.textContent=visible?'Masquer le mot de passe':'Afficher le mot de passe';
  button.setAttribute('aria-pressed',String(visible));
  return true;
 }
 function toggle(){
  const field=$('password');
  if(!field)return false;
  return update(field.type==='password');
 }
 function reset(){return update(false);}
 window.sgPasswordPreview={toggle,reset};
})();
