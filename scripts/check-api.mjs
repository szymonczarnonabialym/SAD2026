import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
assert.equal((await fetch(base+'/api/farm')).status,401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=%2F',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(cookie,'local sign-in cookie');
const request=async(m)=>{const r=await fetch(base+'/api/farm',{method:m?'POST':'GET',headers:{cookie,...(m?{'Content-Type':'application/json','Origin':base}:{})},...(m?{body:JSON.stringify(m)}:{})});return{status:r.status,data:await r.json()}};
const initial=await request();assert.equal(initial.status,200);
const common={date:'2026-09-30',version:0,note:'AUTOMATED LOCAL TEST'};
const p={...common,id:crypto.randomUUID(),kind:'plot',name:'TEST API',variety:'Regina',varieties:['Regina','Wanda'],area:1,initialTrees:10,plantedYear:2020,rootstock:''};
const h={...common,id:crypto.randomUUID(),kind:'harvest',plotId:p.id,variety:'Regina',boxes5:30,boxes10:20};
const t={...common,id:crypto.randomUUID(),kind:'trees',plotId:p.id,treeChange:-3};
const op=r=>({action:'upsert',requestId:crypto.randomUUID(),record:r,expectedVersion:r.version});
const ids=[];
try{
 assert.equal((await request(op(p))).status,200);ids.push(p.id);
 assert.deepEqual((await request()).data.farm.records.find(r=>r.id===p.id).varieties,['Regina','Wanda']);
 const harvestOp=op(h);assert.equal((await request(harvestOp)).status,200);ids.push(h.id);
 assert.equal((await request(harvestOp)).status,200);
 assert.equal((await request()).data.farm.records.filter(r=>r.id===h.id).length,1);
 const wanda={...h,id:crypto.randomUUID(),variety:'Wanda',pricePerKg:4.25};
 assert.equal((await request(op(wanda))).status,200);ids.push(wanda.id);
 assert.equal((await request()).data.farm.records.find(r=>r.id===wanda.id).pricePerKg,4.25);
 assert.equal((await request(op({...h,id:crypto.randomUUID(),variety:'Vega'}))).status,409);
 assert.equal((await request(op({...p,version:1,varieties:['Regina']}))).status,409);
 assert.equal((await request(op(t))).status,200);ids.push(t.id);
 assert.equal((await request(op({...t,id:crypto.randomUUID(),treeChange:-8}))).status,409);
 assert.equal((await request(op({...h,boxes5:50}))).status,409);
 assert.equal((await request({...op({...h,version:1,boxes5:31}),expectedVersion:1})).status,200);
 assert.equal((await request()).data.farm.records.find(r=>r.id===h.id).boxes5,31);
 assert.equal((await request({action:'delete',id:p.id,expectedVersion:1,requestId:crypto.randomUUID()})).status,409);
 const observations=[1,2].map(n=>({...common,id:crypto.randomUUID(),kind:'observation',plotId:null,name:'TEST concurrency '+n}));
 const results=await Promise.all(observations.map(o=>request(op(o))));assert.ok(results.every(r=>r.status===200));ids.push(...observations.map(o=>o.id));
 const fresh=await request();assert.ok(observations.every(o=>fresh.data.farm.records.some(r=>r.id===o.id)));
 console.log('PASS: authenticated persistence, duplicate request, stale edit, tree limits, update, references and concurrent writes');
 const supply={...common,id:crypto.randomUUID(),kind:'stock',name:'TEST API INVENTORY',category:'protection',unit:'l',initialAmount:10,minimum:2};
 assert.equal((await request(op(supply))).status,200);ids.push(supply.id);
 const sprays=[1,2].map(n=>({...common,id:crypto.randomUUID(),kind:'treatment',plotId:p.id,treatment:'Oprysk',product:'',amount:100,unit:'l',cost:0,materials:[{stockId:supply.id,amount:6,unit:'l'}],fruit:'sweet',stage:'white-bud'}));
 const concurrent=await Promise.all(sprays.map(s=>request(op(s))));ids.push(...sprays.map(s=>s.id));
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const persisted=(await request()).data.farm.records.filter(r=>sprays.some(s=>s.id===r.id));assert.equal(persisted.length,1);assert.equal(persisted[0].stage,'white-bud');
 assert.equal((await request({action:'delete',id:supply.id,expectedVersion:1,requestId:crypto.randomUUID()})).status,409);
 const purchase={...common,id:crypto.randomUUID(),kind:'purchase',stockId:supply.id,amount:3,unit:'l'};
 assert.equal((await request(op(purchase))).status,200);ids.push(purchase.id);
 const plan={...common,id:crypto.randomUUID(),kind:'plan',name:'TEST reminder',date:'2027-04-20',leadDays:7,completed:false,plotId:p.id,fruit:'sweet',stage:'flowering'};
 assert.equal((await request(op(plan))).status,200);ids.push(plan.id);
 assert.equal((await request()).data.farm.records.find(r=>r.id===plan.id).leadDays,7);
 console.log('PASS: multi-variety plots, inventory, concurrent stock protection, purchases and reminder persistence');
}finally{
 for(const id of ids.reverse()){const read=await request();const r=read.data.farm.records.find(x=>x.id===id);if(r)assert.equal((await request({action:'delete',id,expectedVersion:r.version,requestId:crypto.randomUUID()})).status,200)}
 // Remove only the explicit local UI test authored in this verification session.
 const read=await request();for(const r of read.data.farm.records.filter(r=>r.note==='TEST LOKALNY — kontrola zapisu'))assert.equal((await request({action:'delete',id:r.id,expectedVersion:r.version,requestId:crypto.randomUUID()})).status,200);
}
