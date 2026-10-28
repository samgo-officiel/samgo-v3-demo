'use strict';
/* Copie locale de l'application WEB TEST vers la future enveloppe native.
 * Aucun dépôt de secrets, aucun accès réseau, aucun achat, aucun paiement live.
 * Ne pas confondre ce bundle préparatoire avec une app iOS/Android testée.
 */
const fs=require('node:fs');
const path=require('node:path');
const projectRoot=path.resolve(__dirname,'..','..');
const mobileRoot=path.resolve(__dirname,'..');
const output=path.join(mobileRoot,'www');
const pages=['index.html','aide.html','donnees-test.html','hors-ligne.html'];
for(const name of pages){
 if(!fs.existsSync(path.join(projectRoot,name)))
   throw Error('Page web requise manquante: '+name);
}
if(!fs.existsSync(path.join(projectRoot,'assets')))throw Error('Dossier assets manquant');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(projectRoot,'assets'),path.join(output,'assets'),{recursive:true});
for(const name of pages)fs.copyFileSync(path.join(projectRoot,name),path.join(output,name));
let html=fs.readFileSync(path.join(output,'index.html'),'utf8');
// Une app native n'a pas besoin du manifeste/worker GitHub Pages :
html=html.replace(/<link\s+rel="manifest"\s+href="manifest\.webmanifest"\s*\/>/,'');
html=html.replace(/<script>\s*\/\* Installation optionnelle de l'app web\.[\s\S]*?<\/script>/,'');
if(html.includes('navigator.serviceWorker.register'))throw Error('Worker web non retiré du bundle natif');
if(!html.includes('window.samgoCreateClient'))throw Error('Application client absente');
fs.writeFileSync(path.join(output,'index.html'),html,'utf8');
console.log('SAMGO TEST : pages et ressources exportées localement pour Capacitor.');
console.log('ATTENTION : génération des projets Android/iOS et tests réels encore nécessaires.');
