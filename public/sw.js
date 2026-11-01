const CACHE='matkon-v2.0.3';
const BASE=new URL('./',self.location.href).pathname;
const SHELL=['./','./index.html','./style.css','./app.js','./core.js','./intelligence.js','./demo.js','./keep-recipes.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/jszip.min.js','./assets/heebo.css','./assets/heebo-0.ttf','./assets/heebo-1.ttf','./assets/heebo-2.ttf','./assets/heebo-3.ttf','./assets/heebo-4.ttf','./assets/frank.css','./assets/frank-0.ttf','./assets/frank-1.ttf','./assets/frank-2.ttf','./assets/focaccia.jpg','./assets/chicken.jpg','./assets/ramen.jpg','./assets/beef.jpg','./assets/salad.jpg','./assets/cake.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('matkon-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(self.location.hostname==='terminal.local')return;
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(async response=>{if(response.ok&&!response.redirected&&new URL(response.url).origin===url.origin){const text=await response.clone().text();if(text.includes('matkon-kitchen')||text.includes('id="app"')){const cache=await caches.open(CACHE);await cache.put(new URL('./index.html',self.location.href),response.clone());}}return response;}).catch(async()=>{const cached=await caches.match(new URL('./index.html',self.location.href));return cached||Response.error();}));
 }else if(SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname)){
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone());}return response;})));
 }
});
