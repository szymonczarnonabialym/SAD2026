import assert from 'node:assert/strict';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
// Isolated workerd/D1 fixture: never uses an actual account or farm.
const password='local-test-'+randomBytes(16).toString('hex'),salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024}).toString('hex');
const config=JSON.stringify({email:'fixture@example.test',passwordHash:`scrypt$16384$8$5$${salt}$${hash}`});
const compiled=await build({stdin:{contents:"import {passwordAuth} from './lib/password-auth'; export default {async fetch(r,e){const a=await passwordAuth(r,e); return a instanceof Response?a:Response.json({owner:a.headers.get('oai-authenticated-user-id')});}}",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'neutral',format:'esm',external:['node:*']});
const options={modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']};
const worker=new Miniflare({...options,bindings:{SAD_LOGIN_CONFIG:config}});
const missing=new Miniflare(options);
try{
 const base='https://sad.example.test';
 assert.equal((await missing.dispatchFetch(base+'/api/farm')).status,503);
 assert.equal((await missing.dispatchFetch(base+'/')).status,503);
 const login=remember=>worker.dispatchFetch(base+'/api/auth/login',{redirect:'manual',method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'fixture@example.test',password,...(remember?{remember:'yes'}:{})})});
 const normal=await login(false);assert.equal(normal.status,303);
 const rawCookie=normal.headers.get('set-cookie');assert.ok(rawCookie.startsWith('__Host-sad_session='));
 for(const flag of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert.ok(rawCookie.includes(flag));
 assert.ok(!rawCookie.includes('Max-Age'));
 const cookie=rawCookie.split(';')[0],token=cookie.split('=')[1];
 const db=await worker.getD1Database('DB');
 const row=await db.prepare('SELECT token_hash,expires FROM auth_sessions').first();
 assert.ok(row.token_hash===createHash('sha256').update(token).digest('hex'),'Only token hash may be stored.');
 assert.ok(row.expires<=Date.now()/1000+43200&&row.expires>Date.now()/1000+43190,'Unremembered lifetime is 12 hours.');
 assert.equal((await worker.dispatchFetch(base+'/api/farm',{headers:{Cookie:cookie,'oai-authenticated-user-id':'forged'}})).status,200);
 await db.prepare('UPDATE auth_sessions SET expires=0 WHERE token_hash=?').bind(row.token_hash).run();
 assert.equal((await worker.dispatchFetch(base+'/api/farm',{headers:{Cookie:cookie}})).status,401);
 const remembered=await login(true),rememberedCookie=remembered.headers.get('set-cookie').split(';')[0];
 assert.ok(remembered.headers.get('set-cookie').includes('Max-Age=2592000'));
 const rememberedRow=await db.prepare('SELECT expires FROM auth_sessions').first();
 assert.ok(rememberedRow.expires<=Date.now()/1000+2592000&&rememberedRow.expires>Date.now()/1000+2591990,'Remembered server lifetime is 30 days.');
 // A mismatched password version invalidates the session, including old cookies.
 await db.prepare("UPDATE auth_sessions SET password_version='old-version'").run();
 assert.equal((await worker.dispatchFetch(base+'/api/farm',{headers:{Cookie:rememberedCookie}})).status,401);
 const fresh=await login(true),freshCookie=fresh.headers.get('set-cookie').split(';')[0];
 const out=await worker.dispatchFetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:freshCookie}});
 assert.equal(out.status,200);assert.ok(out.headers.get('set-cookie').includes('Max-Age=0'));
 assert.equal((await worker.dispatchFetch(base+'/api/farm',{headers:{Cookie:freshCookie}})).status,401);
 console.log('PASS: secure HTTPS cookies, fail-closed configuration, hashed tokens, server expiry (12 hours/30 days), password version and logout revocation in workerd/D1.');
}finally{await worker.dispose();await missing.dispose();}
