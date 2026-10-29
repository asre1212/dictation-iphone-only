// CACHE and FILES are injected by finish-build.mjs.
self.addEventListener('install',event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(FILES))
));

async function cleanOldShells() {
  const windows = (await self.clients.matchAll({type:'window',includeUncontrolled:true}))
    .filter(client => client.url.startsWith(self.registration.scope));
  const currentURLs = new Set(FILES.map(path => new URL(path,self.location.href).href));
  const current = await Promise.all(windows.map(client => new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = value => { clearTimeout(timer); channel.port1.close(); resolve(value); };
    const timer = setTimeout(() => finish(false),2000);
    channel.port1.onmessage = event => finish(currentURLs.has(event.data?.entryURL));
    client.postMessage({type:'GET_APP_ENTRY'},[channel.port2]);
  })));
  // Old app windows keep their assets until every open window runs this build.
  // A sleeping/older client that cannot answer also prevents deletion.
  if (current.every(Boolean)) for (const key of await caches.keys())
    if (key.startsWith('dictation-shell-') && key !== CACHE) await caches.delete(key);
}

self.addEventListener('message',event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'CLEAN_OLD_SHELLS') event.waitUntil(cleanOldShells());
});
self.addEventListener('activate',event => event.waitUntil((async () => {
  await self.clients.claim();
  await cleanOldShells();
})()));
self.addEventListener('fetch',event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    // A page with an active draft may still need its previous hashed JS assets.
    for (const key of await caches.keys()) if (key.startsWith('dictation-shell-') && key !== CACHE) {
      const previous = await (await caches.open(key)).match(event.request);
      if (previous) return previous;
    }
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match(new URL('./index.html',self.location.href));
      throw error;
    }
  })());
});
