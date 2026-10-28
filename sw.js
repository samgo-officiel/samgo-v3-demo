/* SAMGO V3 — service worker de TEST.
 * Seules les pages statiques hors connexion et sécurité sont mises en cache :
 * JAMAIS les sessions, annonces, messages, documents ou réponses API.
 * Les push restent désactivées tant qu'aucune configuration d'envoi n'existe.
 */
const OFFLINE_CACHE='samgo-offline-test-v2';
const OFFLINE_URL=new URL('./hors-ligne.html',self.registration.scope).toString();
const SAFETY_URL=new URL('./securite.html',self.registration.scope).toString();
self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(OFFLINE_CACHE)
   .then(cache=>Promise.allSettled([
    cache.add(new Request(OFFLINE_URL,{cache:'reload'})),
    cache.add(new Request(SAFETY_URL,{cache:'reload'}))
   ]))
   .catch(()=>{}) // La première installation ne doit pas échouer si le réseau tombe.
   .then(()=>self.skipWaiting())
 );
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(names=>Promise.all(
   names.filter(name=>name.startsWith('samgo-offline-test-')&&name!==OFFLINE_CACHE)
        .map(name=>caches.delete(name))
  )),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 // Ne PAS intercepter les API, le GPS, les images, les scripts ou les POST.
 if(event.request.method!=='GET'||event.request.mode!=='navigate')return;
 const target=new URL(event.request.url);
 const scope=new URL(self.registration.scope);
 if(target.origin!==scope.origin||!target.pathname.startsWith(scope.pathname))return;
 event.respondWith(
  fetch(event.request).catch(async()=>{
   const cache=await caches.open(OFFLINE_CACHE);
   if(target.pathname===new URL(SAFETY_URL).pathname){
    const safety=await cache.match(SAFETY_URL);
    if(safety)return safety;
   }
   return (await cache.match(OFFLINE_URL)) ||
    new Response('SAMGO TEST : connexion Internet indisponible.',{
      status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
    });
  })
 );
});
self.addEventListener('push',event=>{
 // Aucun abonnement ni serveur de diffusion n'est active dans la demo.
 event.waitUntil(self.registration.showNotification('SAMGO — Alerte de test',{
  body:'Une nouvelle demande de test est disponible. Ouvrez SAMGO pour la vérifier.',
  tag:'samgo-annonce-test',
  icon:'assets/samgo-app-icon.svg'
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  for(const w of windows){
   if(w.url.startsWith(self.registration.scope)&&w.focus)return w.focus();
  }
  return self.clients.openWindow(self.registration.scope);
 }));
});