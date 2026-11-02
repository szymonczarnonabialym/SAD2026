// Farm register stored as one D1 row per entry, so the register has no single-row size limit.
// Each write runs in one D1 batch (a transaction): the per-owner revision is bumped together with a fresh
// token, and the entry and request rows are written only while that token is still ours. A concurrent writer
// therefore makes the whole batch a no-op and the save is retried against fresh data.
// The former single-row `farms` blob is copied into the new tables on first access and left untouched as a backup.
// @ts-ignore Node TypeScript runner needs source extensions.
import {applyMutation,type Farm,type Mutation,type OrchardRecord} from '../lib/orchard.ts';

type Result={meta:{changes:number}};
type Statement={bind(...values:unknown[]):Statement,first<T=Record<string,unknown>>():Promise<T|null>,all<T=Record<string,unknown>>():Promise<{results:T[]}>,run():Promise<Result>};
/** The part of D1Database used here; node:sqlite can stand in for it in tests. */
export type FarmDb={prepare(sql:string):Statement,batch(statements:Statement[]):Promise<Result[]>};
export class FarmConflictError extends Error{}

const schema=[
 'CREATE TABLE IF NOT EXISTS farms (owner TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER DEFAULT 0 NOT NULL)',
 "CREATE TABLE IF NOT EXISTS farm_state (owner TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL DEFAULT 0, token TEXT NOT NULL DEFAULT '')",
 'CREATE TABLE IF NOT EXISTS farm_records (owner TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, date TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (owner, id))',
 'CREATE TABLE IF NOT EXISTS farm_requests (owner TEXT NOT NULL, request_id TEXT NOT NULL, applied_at INTEGER NOT NULL, PRIMARY KEY (owner, request_id))',
];
// Retry ids older than this are forgotten; offline queues are retried long before that.
const requestRetention=180*86400000;
const recentRequests=500;
const ready=new WeakSet<object>();

async function ensureOwner(db:FarmDb,owner:string){
 if(!ready.has(db)){await db.batch(schema.map(sql=>db.prepare(sql)));ready.add(db)}
 if(await db.prepare('SELECT 1 AS ok FROM farm_state WHERE owner=?').bind(owner).first())return;
 // Idempotent: concurrent first requests copy the same rows and ignore duplicates.
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO farm_records (owner,id,kind,date,version,data) SELECT f.owner,json_extract(r.value,'$.id'),json_extract(r.value,'$.kind'),json_extract(r.value,'$.date'),json_extract(r.value,'$.version'),r.value FROM farms f, json_each(f.data,'$.records') r WHERE f.owner=?").bind(owner),
  db.prepare("INSERT OR IGNORE INTO farm_requests (owner,request_id,applied_at) SELECT f.owner,a.value,0 FROM farms f, json_each(f.data,'$.appliedIds') a WHERE f.owner=?").bind(owner),
  db.prepare('INSERT INTO farm_state (owner,revision,token) VALUES (?,COALESCE((SELECT revision FROM farms WHERE owner=?),0),\'\') ON CONFLICT(owner) DO NOTHING').bind(owner,owner),
 ]);
}

async function load(db:FarmDb,owner:string){
 const [state,rows,requests]=await Promise.all([
  db.prepare('SELECT revision FROM farm_state WHERE owner=?').bind(owner).first<{revision:number}>(),
  db.prepare('SELECT data FROM farm_records WHERE owner=? ORDER BY date,id').bind(owner).all<{data:string}>(),
  db.prepare('SELECT request_id FROM farm_requests WHERE owner=? ORDER BY applied_at DESC,request_id LIMIT ?').bind(owner,recentRequests).all<{request_id:string}>(),
 ]);
 const farm:Farm={records:rows.results.map(r=>JSON.parse(r.data) as OrchardRecord),appliedIds:requests.results.map(r=>r.request_id).reverse()};
 return {farm,revision:state?.revision??0};
}

export async function readFarm(db:FarmDb,owner:string){await ensureOwner(db,owner);return load(db,owner)}

/** Applies one mutation; validation errors are thrown as FarmConflictError, lost races are retried. */
export async function saveMutation(db:FarmDb,owner:string,m:Mutation,now=Date.now()){
 await ensureOwner(db,owner);
 for(let attempt=0;attempt<5;attempt++){
  const state=await db.prepare('SELECT revision FROM farm_state WHERE owner=?').bind(owner).first<{revision:number}>();
  if(!state)throw new Error('Missing farm state');
  if(await db.prepare('SELECT 1 AS ok FROM farm_requests WHERE owner=? AND request_id=?').bind(owner,m.requestId).first())return load(db,owner);
  const rows=await db.prepare('SELECT data FROM farm_records WHERE owner=?').bind(owner).all<{data:string}>();
  let next:Farm;
  try{next=applyMutation({records:rows.results.map(r=>JSON.parse(r.data) as OrchardRecord),appliedIds:[]},m)}catch(e){throw new FarmConflictError((e as Error).message)}
  const token=crypto.randomUUID(),guard='(SELECT token FROM farm_state WHERE owner=?)=?';
  const id=m.action==='delete'?m.id:m.record.id,saved=next.records.find(r=>r.id===id);
  const change=m.action==='delete'
   ?db.prepare(`DELETE FROM farm_records WHERE owner=? AND id=? AND ${guard}`).bind(owner,id,owner,token)
   :db.prepare(`INSERT INTO farm_records (owner,id,kind,date,version,data) SELECT ?,?,?,?,?,? WHERE ${guard} ON CONFLICT(owner,id) DO UPDATE SET kind=excluded.kind,date=excluded.date,version=excluded.version,data=excluded.data`).bind(owner,id,saved!.kind,saved!.date,saved!.version,JSON.stringify(saved),owner,token);
  const results=await db.batch([
   db.prepare('UPDATE farm_state SET revision=revision+1,token=? WHERE owner=? AND revision=?').bind(token,owner,state.revision),
   change,
   db.prepare(`INSERT INTO farm_requests (owner,request_id,applied_at) SELECT ?,?,? WHERE ${guard} ON CONFLICT(owner,request_id) DO NOTHING`).bind(owner,m.requestId,now,owner,token),
   db.prepare(`DELETE FROM farm_requests WHERE owner=? AND applied_at<? AND ${guard}`).bind(owner,now-requestRetention,owner,token),
  ]);
  if(results[0].meta.changes===1)return load(db,owner);
 }
 throw new Error('Trwa inny zapis. Spróbuj ponownie.');
}
