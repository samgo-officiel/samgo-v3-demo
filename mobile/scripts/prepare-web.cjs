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
const pages=['index.html','aide.html','mes-alertes.html','conditions-generales.html','donnees-test.html','securite.html','hors-ligne.html'];
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
const WEB_ACCOUNT_CALLBACK='https://samgo-officiel.github.io/samgo-v3-demo/';
function replaceOnce(source,needle,replacement,label){
 if(source.split(needle).length!==2)throw Error('Source modifiée : '+label);
 return source.replace(needle,replacement);
}
// Une app native n'a pas besoin du manifeste/worker GitHub Pages :
html=html.replace(/<link\s+rel="manifest"\s+href="manifest\.webmanifest"\s*\/>/,'');
html=html.replace(/<script>\s*\/\* Installation optionnelle de l'app web\.[\s\S]*?<\/script>/,'');
// Un conteneur Android/iOS n'a pas une URL de confirmation de compte
// reconnue par Supabase (http://localhost ou capacitor://localhost).
// Les e-mails ouvrent la page HTTPS vérifiée ; on revient se connecter
// dans SAMGO TEST après confirmation. Aucun lien OAuth ni token n'est
// intercepté automatiquement par l'application native.
html=replaceOnce(html,
 'emailRedirectTo:window.location.origin+window.location.pathname',
 'emailRedirectTo:'+JSON.stringify(WEB_ACCOUNT_CALLBACK),'e-mail inscription native');
html=replaceOnce(html,
 'if (destination && destination.origin !== window.location.origin)',
 'if (destination && destination.href !== '+JSON.stringify(WEB_ACCOUNT_CALLBACK)+')',
 'liste blanche d\'URL de confirmation native');
html=replaceOnce(html,'</head>',
 '<style id="sg-native-only">#sgMobileInstall{display:none!important}#sgNativeLinkStatus:empty{display:none!important}#sgNativeLinkStatus{position:fixed;z-index:52000;left:12px;right:12px;top:calc(16px + env(safe-area-inset-top));padding:12px;border:1px solid #a9874a;border-radius:12px;background:#302717;color:#ffdf9b;font-size:13px;text-align:center}</style></head>',
 'masquer installation PWA native');
html=replaceOnce(html,'<body class="sg-home-active">',
 '<body class="sg-home-active"><p id="sgNativeLinkStatus" role="status" aria-live="polite"></p>',
 'afficher erreurs navigateur externe sur native');
html=replaceOnce(html,'<h2 id="accountTitle">Créer mon compte</h2>',
 '<h2 id="accountTitle">Créer mon compte</h2><p class="notice" id="sgNativeAuthNotice">Dans SAMGO TEST sur téléphone, les e-mails de confirmation et de récupération ouvrent le site SAMGO sécurisé. Terminez la validation sur le site, puis revenez vous connecter ici.</p>',
 'aide au compte sur application native');
html=replaceOnce(html,'</body>',
 '<script src="assets/native-navigation.js"></script></body>',
 'navigation native Android');
fs.copyFileSync(path.join(mobileRoot,'native-navigation.js'),
 path.join(output,'assets/native-navigation.js'));
if(html.includes('navigator.serviceWorker.register'))throw Error('Worker web non retiré du bundle natif');
if(!html.includes('window.samgoCreateClient'))throw Error('Application client absente');
fs.writeFileSync(path.join(output,'index.html'),html,'utf8');
const resetFile=path.join(output,'assets/recuperation-compte-test.js');
const reset=fs.readFileSync(resetFile,'utf8');
fs.writeFileSync(resetFile,replaceOnce(reset,
 'const redirect=window.location.origin+window.location.pathname;',
 'const redirect='+JSON.stringify(WEB_ACCOUNT_CALLBACK)+';',
 'e-mail récupération native'),'utf8');
console.log('SAMGO TEST : pages et ressources exportées localement pour Capacitor.');
console.log('ATTENTION : génération des projets Android/iOS et tests réels encore nécessaires.');
