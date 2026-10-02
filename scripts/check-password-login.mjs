import assert from 'node:assert/strict';
// Test an isolated local Cloudflare worker. Credentials are supplied on stdin.
let input='';for await(const chunk of process.stdin)input+=chunk;
const {email,password}=JSON.parse(input);
const base=process.env.SAD_TEST_URL??'http://127.0.0.1:5174';
assert.ok(new URL(base).hostname==='127.0.0.1','Use a local test worker.');
const request=(path,options={})=>fetch(base+path,{redirect:'manual',...options});
const login=(pass=password,remember=false,cookie='',ip='198.51.100.10')=>request('/api/auth/login',{
  method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})},
  body:new URLSearchParams({email,password:pass,...(remember?{remember:'yes'}:{})}),
});
const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
const farm=cookie=>request('/api/farm',{headers:{Cookie:cookie}});
assert.equal((await request('/api/farm')).status,401);
assert.equal((await request('/api/farm',{headers:{'oai-authenticated-user-id':'cloudflare:'+email,'Cf-Access-Authenticated-User-Email':email}})).status,401);
assert.equal((await request('/')).headers.get('location'),'/login');
const page=await request('/login');assert.equal(page.status,200);assert.ok((await page.text()).includes('Zapamiętaj to urządzenie'));
assert.equal((await request('/api/auth/login')).status,405);
assert.equal((await request('/api/auth/login',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
const wrong=await login('wrong-password');assert.equal(wrong.status,401);assert.ok((await wrong.text()).includes('Nieprawidłowy login lub hasło'));
const normal=await login();assert.equal(normal.status,303,'Valid password must log in.');
const normalCookie=cookieOf(normal);assert.ok(normalCookie);
assert.ok(normal.headers.get('set-cookie').includes('HttpOnly'));assert.ok(normal.headers.get('set-cookie').includes('SameSite=Lax'));assert.ok(!normal.headers.get('set-cookie').includes('Max-Age'));
const original=await farm(normalCookie);assert.equal(original.status,200);
const data=await original.json();assert.equal(data.userId,'cloudflare:'+email.toLowerCase());
const remembered=await login(password,true);assert.equal(remembered.status,303);assert.ok(remembered.headers.get('set-cookie').includes('Max-Age=2592000'));
const rememberedCookie=cookieOf(remembered);assert.equal((await farm(rememberedCookie)).status,200);
// Exercise actual data writes without altering existing records.
const id=crypto.randomUUID(),record={id,kind:'observation',plotId:null,name:'Test logowania',date:new Date().toISOString().slice(0,10),note:'Automatyczny test lokalny',version:0};
const mutate=m=>request('/api/farm',{method:'POST',headers:{Origin:base,Cookie:rememberedCookie,'Content-Type':'application/json'},body:JSON.stringify(m)});
const saved=await mutate({action:'upsert',requestId:crypto.randomUUID(),record,expectedVersion:0});assert.equal(saved.status,200);
const savedFarm=(await saved.json()).farm;const inserted=savedFarm.records.find(r=>r.id===id);assert.ok(inserted);
assert.equal((await mutate({action:'delete',requestId:crypto.randomUUID(),id,expectedVersion:inserted.version})).status,200);
assert.equal((await request('/api/auth/logout',{headers:{Cookie:rememberedCookie}})).status,405);
assert.equal((await request('/api/auth/logout',{method:'POST',headers:{Origin:'https://other.example',Cookie:rememberedCookie}})).status,403);
const out=await request('/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:normalCookie}});assert.equal(out.status,200);assert.ok(out.headers.get('set-cookie').includes('Max-Age=0'));
assert.equal((await farm(normalCookie)).status,401);assert.equal((await farm(rememberedCookie)).status,200);
const rotated=await login(password,true,rememberedCookie);assert.equal(rotated.status,303);assert.equal((await farm(rememberedCookie)).status,401);
assert.equal((await farm('sad_session='+'a'.repeat(64))).status,401);
await request('/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:cookieOf(rotated)}});
// One shared address must be limited even when requests arrive concurrently.
const ip='198.51.100.'+Math.floor(20+Math.random()*200);
const burst=await Promise.all(Array.from({length:11},()=>login('wrong-password',false,'',ip)));
assert.ok(burst.some(r=>r.status===429),'Concurrent login attempts must be limited.');
console.log('PASS: login, wrong password, spoofed headers, CSRF, remember 30 days, data owner, read/write, session rotation, logout and rate limiting.');
