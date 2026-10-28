/* SAMGO TEST — nettoyer uniquement les données locales non sensibles de la démo.
 * Ne jamais effacer la session d'authentification ni les enregistrements Supabase.
 * Aucun GPS lu, aucun appel réseau.
 */
(function(){
 'use strict';
 function clear(){
  const confirmAction=typeof window.confirm!=='function'||window.confirm(
   'Effacer la simulation locale et remettre à zéro le rayon et le tri des demandes ? Le compte et les données serveur ne seront pas supprimés.'
  );
  if(!confirmAction)return false;
  if(typeof resetLocalDemo==='function')resetLocalDemo();
  window.sgDriverPrefs?.reset?.();
  const output=document.getElementById('sgLocalClearStatus');
  if(output)output.textContent='Simulation locale et préférences de recherche effacées sur cet appareil. Votre compte et vos annonces serveur n’ont pas été supprimés.';
  return true;
 }
 window.sgLocalClearTest={clear};
})();
