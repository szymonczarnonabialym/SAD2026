const CACHE='moj-sad-shell-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('message',e=>{if(e.data?.type==='warm')e.waitUntil((async()=>{const c=await caches.open(CACHE);const urls=['/',...(Array.isArray(e.data.urls)?e.data.urls:[])].filter(v=>{try{const u=new URL(v,self.location.origin);return u.origin===self.location.origin&&(u.pathname==='/'||/\.(js|css|png|svg)$/.test(u.pathname))}catch{return false}});await Promise.allSettled(urls.map(async u=>{const r=await fetch(u);if(r.ok&&!r.redirected)await c.put(u,r)}))})())});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('moj-sad-shell-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(u.origin!==self.location.origin||e.request.method!=='GET'||u.pathname.startsWith('/api/')||u.pathname.includes('signin')||u.pathname.includes('signout')||u.pathname.includes('callback'))return;
 if(e.request.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok&&!r.redirected&&r.headers.get('content-type')?.includes('text/html'))await c.put('/',r.clone());return r}catch{return await c.match('/')||Response.error()}})());return;}
 if(/\.(js|css|png|svg|webmanifest)$/.test(u.pathname)){e.respondWith((async()=>{const c=await caches.open(CACHE);const old=await c.match(e.request);if(old)return old;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r})());}
});
