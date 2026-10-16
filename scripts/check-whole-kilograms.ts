import assert from 'node:assert/strict';
// @ts-ignore Node's TypeScript runner requires the source extension.
import {isWholeKilogramInput,parseDecimalInput} from '../lib/decimal-input.ts';
// @ts-ignore Node's TypeScript runner requires the source extension.
import {correctPendingHarvest} from '../lib/pending-harvest.ts';
// @ts-ignore Node's TypeScript runner requires the source extension.
import {applyMutation,type Farm,type Harvest,type Mutation} from '../lib/orchard.ts';
// @ts-ignore Node's TypeScript runner requires the source extension.
import {loginPage} from '../lib/password-login-page.ts';

for(const value of ['1','48','100000000'])assert.equal(isWholeKilogramInput(value),true,value);
for(const value of ['','0','48,5','48.5','48,0','48.0','-48','1e2','48 ','100000001'])assert.equal(isWholeKilogramInput(value),false,value);
assert.equal(parseDecimalInput('4,25'),4.25);
assert.equal(parseDecimalInput('4.25'),4.25);
assert.ok(Number.isNaN(parseDecimalInput('4,2.5')));
const harvest:Harvest={id:crypto.randomUUID(),kind:'harvest',date:'2026-10-16',plotId:null,variety:'Łutówka',boxes5:0,boxes10:0,weightKg:48.5,pricePerKg:4.25,note:'Nie zgub notatki',version:0};
const blocked:Mutation={action:'upsert',requestId:crypto.randomUUID(),record:harvest,expectedVersion:0};
const next:Mutation={...blocked,requestId:crypto.randomUUID(),record:{...harvest,id:crypto.randomUUID(),weightKg:48}};
const farm:Farm={records:[],appliedIds:[]},pending=[blocked,next],before=JSON.stringify(pending);
assert.throws(()=>applyMutation(farm,blocked),/pełne kilogramy/);
assert.throws(()=>correctPendingHarvest(farm,pending,blocked.requestId,harvest));
const corrected=correctPendingHarvest(farm,pending,blocked.requestId,{...harvest,weightKg:48});
assert.equal(JSON.stringify(pending),before,'Repair must not mutate persisted inputs.');
assert.equal(corrected.length,2);
assert.equal(corrected[1],next,'Later entries must be retained.');
assert.notEqual(corrected[0].requestId,blocked.requestId);
assert.equal(corrected[0].action,'upsert');
if(corrected[0].action!=='upsert')throw new Error('Expected harvest');
assert.equal(corrected[0].record.id,harvest.id);
assert.equal(corrected[0].expectedVersion,0);
assert.equal(corrected[0].record.note,harvest.note);
const saved=corrected.reduce(applyMutation,farm);
assert.equal(saved.records.length,2);
assert.deepEqual(applyMutation(saved,corrected[0]),saved,'Retries must not duplicate harvests.');
assert.throws(()=>correctPendingHarvest({...farm,appliedIds:[blocked.requestId]},pending,blocked.requestId,{...harvest,weightKg:48}),/już zapisany/);
assert.throws(()=>correctPendingHarvest(farm,pending,blocked.requestId,{...harvest,id:crypto.randomUUID(),weightKg:48}),/Nie znaleziono/);
for(const error of ['', 'Nieprawidłowy login lub hasło.']){
 const html=await loginPage('private-owner@example.test',error).text();
 assert.ok(!html.includes('private-owner@example.test'));
 assert.ok(!/<input[^>]*id="email"[^>]*\bvalue=/.test(html),'Login must start blank, also after an error.');
 assert.ok(html.includes('Zapamiętaj to urządzenie'));
}
console.log('PASS: whole kilograms, decimal prices, blocked queue repair, idempotent retries and private blank login.');
