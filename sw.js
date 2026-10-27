/* SAMGO — service worker : préparation Web Push sans abonnement actif.
   NE met pas en cache les pages, sessions, documents ou réponses API. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  // Aucune notification n'arrive tant qu'un serveur push et des abonnements ne sont pas configurés.
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