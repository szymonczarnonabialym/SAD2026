import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
// Receive credentials on stdin, never in shell arguments or checked-in source.
let input=''; for await (const chunk of process.stdin) input+=chunk;
const {email,password}=JSON.parse(input);
if(typeof email!=='string'||!email.includes('@')||typeof password!=='string'||password.length<10)throw Error('Podaj e-mail i hasło w JSON na stdin.');
const salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024}).toString('hex');
const config=JSON.stringify({email:email.trim().toLowerCase(),passwordHash:`scrypt$16384$8$5$${salt}$${hash}`});
await mkdir('.sites-runtime',{recursive:true});
await writeFile('.sites-runtime/sad-login-secret.json',config+'\n',{mode:0o600});
await writeFile('.dev.vars',`SAD_LOGIN_CONFIG='${config}'\n`,{mode:0o600});
console.log('Utworzono .sites-runtime/sad-login-secret.json i lokalne .dev.vars. Hasła nie zapisano.');
