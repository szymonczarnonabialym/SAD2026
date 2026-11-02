import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
// @ts-ignore Node TypeScript runner needs source extensions.
import {readFarm,saveMutation,FarmConflictError,type FarmDb} from '../db/farm-store.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {recordSchema,type OrchardRecord} from '../lib/orchard.ts';

// Minimal D1 stand-in on node:sqlite; batch() runs as one transaction like D1.
function sqliteD1(sqlite:DatabaseSync):FarmDb{
 const statement=(sql:string,params:unknown[]=[]):any=>({
  bind:(...values:unknown[])=>statement(sql,values),
  first:async()=>sqlite.prepare(sql).get(...(params as any[]))??null,
  all:async()=>({results:sqlite.prepare(sql).all(...(params as any[]))}),
  run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...(params as any[])).changes)}}),
  runSync:()=>({meta:{changes:Number(sqlite.prepare(sql).run(...(params as any[])).changes)}}),
 });
 return {prepare:sql=>statement(sql),batch:async(list:any[])=>{sqlite.exec('BEGIN');try{const r=list.map(s=>s.runSync());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
const sqlite=new DatabaseSync(':memory:'),db=sqliteD1(sqlite);
const base={note:'',version:0};
const add=(record:OrchardRecord)=>({action:'upsert' as const,requestId:crypto.randomUUID(),expectedVersion:record.version,record:recordSchema.parse(record)});
const plot={...base,id:crypto.randomUUID(),kind:'plot',date:'2020-03-01',name:'Wiśnie',variety:'Łutówka',initialTrees:100,area:1,plantedYear:2015,rootstock:''} as OrchardRecord;
const harvest=(date:string,kg:number)=>({...base,id:crypto.randomUUID(),kind:'harvest',date,plotId:plot.id,variety:'Łutówka',boxes5:0,boxes10:0,weightKg:kg,pricePerKg:4}) as OrchardRecord;

// A new owner starts empty and gets the tables created on first access.
let state=await readFarm(db,'alice');
assert.deepEqual(state,{farm:{records:[],appliedIds:[]},revision:0});

// Saves go to separate rows; the revision grows with every write.
const first=add(plot);
state=await saveMutation(db,'alice',first);
assert.equal(state.revision,1);assert.equal(state.farm.records.length,1);assert.equal(state.farm.records[0].version,1);
const h1=harvest('2026-07-01',100);
state=await saveMutation(db,'alice',add(h1));
assert.equal(state.revision,2);
assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM farm_records WHERE owner='alice'").get() as any).n,2);
// Retrying the same request does not duplicate it.
state=await saveMutation(db,'alice',first);
assert.equal(state.revision,2);assert.equal(state.farm.records.length,2);
assert.ok(state.farm.appliedIds.includes(first.requestId));

// Validation errors leave the register unchanged.
await assert.rejects(saveMutation(db,'alice',add({...harvest('2026-07-02',5),plotId:crypto.randomUUID()} as OrchardRecord)),FarmConflictError);
await assert.rejects(saveMutation(db,'alice',add({...plot,version:0} as OrchardRecord)),/innym urządzeniu/);
assert.equal((await readFarm(db,'alice')).revision,2);

// Edit and delete update one row each.
const edited={...state.farm.records.find(r=>r.id===h1.id)!,weightKg:120} as OrchardRecord;
state=await saveMutation(db,'alice',add(edited));
assert.equal((state.farm.records.find(r=>r.id===h1.id) as any).weightKg,120);
assert.equal(state.farm.records.find(r=>r.id===h1.id)!.version,2);
state=await saveMutation(db,'alice',{action:'delete',requestId:crypto.randomUUID(),id:h1.id,expectedVersion:2});
assert.equal(state.farm.records.length,1);
// A plot with entries still cannot be removed.
await saveMutation(db,'alice',add(harvest('2026-07-03',10)));
await assert.rejects(saveMutation(db,'alice',{action:'delete',requestId:crypto.randomUUID(),id:plot.id,expectedVersion:1}),/Kwatera/);

// Owners are isolated.
assert.equal((await readFarm(db,'bob')).farm.records.length,0);

// A concurrent writer between reading and committing: the first batch becomes a no-op and the save is retried.
const realBatch=db.batch;let raced=false;
db.batch=async list=>{if(!raced){raced=true;await saveMutation(db,'alice',add(harvest('2026-07-04',20)))}return realBatch(list)};
const before=(await readFarm(db,'alice')).revision;
state=await saveMutation(db,'alice',add(harvest('2026-07-05',30)));
db.batch=realBatch;
assert.equal(state.revision,before+2);
assert.equal(state.farm.records.filter(r=>r.kind==='harvest').length,3);
// The guard: a batch with a stale token writes nothing.
sqlite.prepare("UPDATE farm_state SET token='someone-else' WHERE owner='alice'").run();
const stray=crypto.randomUUID();
sqlite.prepare("INSERT INTO farm_records (owner,id,kind,date,version,data) SELECT 'alice',?,'harvest','2026-01-01',1,'{}' WHERE (SELECT token FROM farm_state WHERE owner='alice')='mine'").run(stray);
assert.equal(sqlite.prepare('SELECT 1 FROM farm_records WHERE id=?').get(stray),undefined);

// The old single-row blob is copied on first access, keeps its revision and stays as a backup.
const legacy={records:[{...plot,version:3},{...harvest('2025-07-01',50),version:1}],appliedIds:['old-1','old-2']};
sqlite.prepare('INSERT INTO farms (owner,data,revision) VALUES (?,?,?)').run('carol',JSON.stringify(legacy),7);
state=await readFarm(db,'carol');
assert.equal(state.revision,7);
assert.deepEqual(state.farm.records.map(r=>r.id).sort(),legacy.records.map(r=>r.id).sort());
assert.deepEqual(state.farm.appliedIds.sort(),['old-1','old-2']);
state=await saveMutation(db,'carol',add(harvest('2026-07-01',60)));
assert.equal(state.revision,8);assert.equal(state.farm.records.length,3);
assert.equal((sqlite.prepare("SELECT data FROM farms WHERE owner='carol'").get() as any).data,JSON.stringify(legacy));
// Old retry ids (time 0) are pruned after the next write; recent ones stay.
assert.ok(!state.farm.appliedIds.includes('old-1'));

// No register-wide size limit any more: well over the former 1.5 MB still accepts new entries.
const insert=sqlite.prepare("INSERT INTO farm_records (owner,id,kind,date,version,data) VALUES ('dave',?,'harvest',?,1,?)");
await readFarm(db,'dave');await saveMutation(db,'dave',add(plot));
sqlite.exec('BEGIN');
for(let i=0;i<8000;i++){const h={...harvest('2024-07-01',10+i%50),version:1,note:'Zbiór z kwatery przy drodze, skrzynki odebrane przez skup.'};insert.run(h.id,h.date,JSON.stringify(h))}
sqlite.exec('COMMIT');
const size=(sqlite.prepare("SELECT SUM(LENGTH(data)) AS n FROM farm_records WHERE owner='dave'").get() as any).n;
assert.ok(size>1500000,'test register should exceed the former limit');
state=await saveMutation(db,'dave',add(harvest('2026-07-01',1)));
assert.equal(state.farm.records.length,8002);
console.log(`PASS: per-entry rows, revisions, retries, validation, edits/deletes, owner isolation, concurrent writers, legacy blob migration and a ${(size/1e6).toFixed(1)} MB register.`);
