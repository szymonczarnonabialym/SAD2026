import { createHash, randomBytes } from 'node:crypto';
import { validPasswordHash, verifyPassword } from './password-crypto';
import { loginPage } from './password-login-page';

export type PasswordEnv = { DB?: D1Database; SAD_LOGIN_CONFIG?: string };
type Config = { email: string; passwordHash: string };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const json = (data: unknown, status = 200, extra: Record<string,string> = {}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
const redirect = (location: string, extra: Record<string,string> = {}) => new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store',...extra}});
export function loginConfig(raw?: string): Config | null {
  try {
    const parsed = JSON.parse(raw ?? '');
    if (typeof parsed.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email) || !validPasswordHash(parsed.passwordHash)) return null;
    return {email:parsed.email.trim().toLowerCase(),passwordHash:parsed.passwordHash};
  } catch { return null; }
}
const secure = (request: Request) => new URL(request.url).protocol === 'https:';
const cookieName = (request: Request) => secure(request) ? '__Host-sad_session' : 'sad_session';
function sessionToken(request: Request): string | null {
  const value = (request.headers.get('Cookie') ?? '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(request)+'='))?.slice(cookieName(request).length+1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function sessionCookie(request: Request, token: string, maxAge?: number): string {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Lax${secure(request)?'; Secure':''}${maxAge!==undefined?`; Max-Age=${maxAge}`:''}`;
}
export async function ensureLoginTables(db: D1Database) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, expires INTEGER NOT NULL, password_version TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS auth_login_attempts (bucket TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)'),
  ]);
}
function trustedRequest(request: Request, email: string): Request {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  // Retain the owner used by the previous Access login, preserving the same farm.
  headers.set('oai-authenticated-user-id', 'cloudflare:'+email);
  headers.set('oai-authenticated-user-email', email);
  return new Request(request,{headers});
}
export async function passwordAuth(request: Request, env: PasswordEnv): Promise<Request | Response> {
  const url = new URL(request.url), config = loginConfig(env.SAD_LOGIN_CONFIG);
  const loginPath = ['/login','/signin-with-chatgpt','/callback'].includes(url.pathname);
  if (!config || !env.DB) {
    const error='Logowanie nie jest jeszcze skonfigurowane. Dodaj sekret SAD_LOGIN_CONFIG do ustawień aplikacji.';
    return url.pathname.startsWith('/api/') ? json({error},503) : loginPage('',error,503);
  }
  const db=env.DB, now=Math.floor(Date.now()/1000), owner='cloudflare:'+config.email, version=digest(config.email+'\n'+config.passwordHash);
  const token=sessionToken(request);
  if (url.pathname==='/api/auth/login') {
    if (request.method!=='POST') return json({error:'Użyj formularza logowania.'},405,{Allow:'POST'});
    if (request.headers.get('Origin')!==url.origin) return json({error:'Nieprawidłowe źródło żądania.'},403);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || Number(request.headers.get('Content-Length')??0)>4096) return json({error:'Nieprawidłowy formularz.'},400);
    const body=await request.text(); if(body.length>4096)return json({error:'Formularz jest zbyt długi.'},413);
    const form=new URLSearchParams(body), email=(form.get('email')??'').trim().toLowerCase(), password=form.get('password')??'';
    await ensureLoginTables(db);
    const ip=request.headers.get('CF-Connecting-IP')??'local';
    const buckets=[{key:'ip:'+digest(ip)+':'+Math.floor(now/900),limit:10,expires:now+900},{key:'global:'+Math.floor(now/60),limit:60,expires:now+60}];
    const attempts=await db.batch(buckets.map(bucket=>db.prepare('INSERT INTO auth_login_attempts (bucket,attempts,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket.key,bucket.expires)));
    if(attempts.some((result,index)=>Number((result.results[0] as {attempts:number})?.attempts)>buckets[index].limit)) {
      const response=loginPage(config.email,'Za dużo prób logowania. Spróbuj ponownie za 15 minut.',429);response.headers.set('Retry-After','900');return response;
    }
    // Perform the KDF even for a wrong email to avoid a cheap account oracle.
    const matches=verifyPassword(password,config.passwordHash);
    if(email!==config.email||!matches)return loginPage(config.email,'Nieprawidłowy login lub hasło.',401);
    const remembered=form.get('remember')==='yes', lifetime=remembered?30*24*60*60:12*60*60;
    const next=randomBytes(32).toString('hex');
    const operations=[db.prepare('DELETE FROM auth_sessions WHERE expires<=?').bind(now),db.prepare('DELETE FROM auth_login_attempts WHERE expires<=? OR bucket=?').bind(now,buckets[0].key)];
    if(token)operations.push(db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(digest(token)));
    operations.push(db.prepare('INSERT INTO auth_sessions (token_hash,owner,expires,password_version) VALUES (?,?,?,?)').bind(digest(next),owner,now+lifetime,version));
    await db.batch(operations);
    return redirect('/',{'Set-Cookie':sessionCookie(request,next,remembered?lifetime:undefined)});
  }
  if(url.pathname==='/api/auth/logout'||url.pathname==='/signout-with-chatgpt') {
    if(request.method!=='POST')return json({error:'Wylogowanie wymaga POST.'},405,{Allow:'POST'});
    if(request.headers.get('Origin')!==url.origin)return json({error:'Nieprawidłowe źródło żądania.'},403);
    if(token){await ensureLoginTables(db);await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(digest(token)).run();}
    return json({ok:true},200,{'Set-Cookie':sessionCookie(request,'',0)});
  }
  let session: {owner:string} | null=null;
  if(token){
    await ensureLoginTables(db);
    session=await db.prepare('SELECT owner FROM auth_sessions WHERE token_hash=? AND expires>? AND password_version=? AND owner=?').bind(digest(token),now,version,owner).first<{owner:string}>();
  }
  if(loginPath)return session?redirect('/'):loginPage(config.email);
  if(!session)return url.pathname.startsWith('/api/')?json({error:'Zaloguj się, aby otworzyć rejestr.'},401):redirect('/login');
  if(url.pathname==='/api/auth/session')return json({email:config.email,userId:owner});
  return trustedRequest(request,config.email);
}
