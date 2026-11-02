import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript runner needs source extensions.
import {applyMutation,recordSchema,type OrchardRecord,type Farm} from '../lib/orchard.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {soilTests,soilTimeline,previousSoilTest,soilSummary} from '../lib/soil.ts';
const add=(record:OrchardRecord)=>({action:'upsert' as const,requestId:crypto.randomUUID(),expectedVersion:record.version,record:recordSchema.parse(record)});
const plot:OrchardRecord={id:crypto.randomUUID(),kind:'plot',date:'2020-03-01',note:'',version:0,name:'Wiśnie za domem',variety:'Łutówka',initialTrees:100,area:1,plantedYear:2015,rootstock:''};
const soil=(date:string,values:Record<string,number>,depth='0–20 cm',plotId:string|null=plot.id):OrchardRecord=>({id:crypto.randomUUID(),kind:'soil',date,note:'',version:0,plotId,depth,lab:'OSChR',values} as OrchardRecord);
let farm:Farm=applyMutation({records:[],appliedIds:[]},add(plot));
const first=soil('2022-04-10',{ph:5.4,p2o5:18,k2o:22}),second=soil('2024-04-12',{ph:6.1,p2o5:21}),deeper=soil('2024-04-12',{ph:5.2},'20–40 cm'),again=soil('2024-09-01',{ph:6.3});
for(const r of [first,second,deeper,again])farm=applyMutation(farm,add(r));
assert.equal(soilTests(farm.records).length,4);
assert.equal(soilTests(farm.records,'none').length,0);
// A test without any value is rejected, as is pH outside 0–14 and a missing plot.
assert.throws(()=>applyMutation(farm,add(soil('2025-04-01',{}))),/co najmniej jeden wynik/);
assert.throws(()=>recordSchema.parse(soil('2025-04-01',{ph:15})));
assert.throws(()=>applyMutation(farm,add(soil('2025-04-01',{ph:6},'0–20 cm',crypto.randomUUID()))),/Kwatera/);
// Plots with soil tests cannot be deleted.
assert.throws(()=>applyMutation(farm,{action:'delete',requestId:crypto.randomUUID(),id:plot.id,expectedVersion:1}),/Kwatera/);
// Yearly timeline: one series per depth, gaps for years without tests, tests in one year averaged.
const ph=soilTimeline(farm.records,'ph');
assert.equal(ph.series.length,2);
assert.deepEqual(ph.data.map(r=>r.year),[2022,2023,2024]);
assert.equal(ph.data[0].s0,5.4);
assert.equal(ph.data[1].s0,null);
assert.equal(ph.data[2].s0,6.2);
assert.equal(ph.data[2].s1,5.2);
assert.equal(soilTimeline(farm.records,'k2o').data.length,1);
assert.equal(soilTimeline(farm.records,'zn').count,0);
// The change is measured against the previous test from the same place.
const tests=soilTests(farm.records);
assert.equal(previousSoilTest(tests,tests.find(t=>t.id===second.id)!)?.id,first.id);
assert.equal(previousSoilTest(tests,tests.find(t=>t.id===deeper.id)!),null);
assert.equal(previousSoilTest(tests,tests.find(t=>t.id===again.id)!)?.id,second.id);
assert.match(soilSummary(tests[0]),/pH 5,4 · P₂O₅ 18 mg\/100 g/);
console.log('Soil tests OK');
