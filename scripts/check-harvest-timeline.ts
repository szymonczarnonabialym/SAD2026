import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript runner needs source extensions.
import {harvestTimeline} from '../lib/harvest-timeline.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {type OrchardRecord} from '../lib/orchard.ts';
const base={id:'p',date:'2026-01-01',version:1,note:''};
const records:OrchardRecord[]=[
 {...base,kind:'plot',name:'Czereśnie',variety:'Regina',varieties:['Regina','Własna.1'],initialTrees:150,area:1,plantedYear:null,rootstock:''},
 {...base,id:'h1',kind:'harvest',plotId:'p',variety:'Regina',boxes5:2,boxes10:4},
 {...base,id:'h2',kind:'harvest',plotId:'p',variety:'Regina',boxes5:2,boxes10:0},
 {...base,id:'h3',kind:'harvest',date:'2028-06-01',plotId:'p',variety:'Własna.1',boxes5:0,boxes10:12},
 {...base,id:'h4',kind:'harvest',plotId:'other',variety:'Łutówka',boxes5:0,boxes10:0,weightKg:300.5},
 {...base,id:'h5',kind:'harvest',date:'2025-06-01',plotId:'p',variety:'Regina',boxes5:0,boxes10:100},
 {...base,id:'h6',kind:'harvest',plotId:null,variety:'Vega',boxes5:0,boxes10:5},
];
const all=harvestTimeline(records,'2029');
assert.deepEqual(all.data.map(r=>r.year),[2026,2027,2028,2029]);
assert.equal(all.data[0].sour,300.5);assert.equal(all.data[0].sweet,110);
assert.equal(all.data[1].sweet,null);assert.equal(all.data[2].sweet,120);
const plot=harvestTimeline(records,'2029','p');
assert.deepEqual(plot.names,['Regina','Własna.1']);
assert.equal(plot.data[0].sweet,60);assert.equal(plot.data[0].sour,null);
assert.equal(plot.data[0].v0,60);assert.equal(plot.data[0].v1,null);
assert.equal(plot.data[2].v1,120);assert.equal(plot.data[3].sweet,null);
const loose=harvestTimeline(records,'2026','none');
assert.deepEqual(loose.names,['Vega']);assert.equal(loose.data[0].sweet,50);
assert.equal(harvestTimeline([],'2026').hasHarvests,false);
assert.deepEqual(harvestTimeline([],'2026').data,[{year:2026,sour:null,sweet:null}]);
assert.deepEqual(harvestTimeline(records.slice(0,2),'2026','p').data.map(r=>r.year),[2026]);
console.log('PASS: chart yearly aggregation, separate species, plot/unassigned filters, custom varieties, gaps, empty/single-year series and exclusion of 2025.');
