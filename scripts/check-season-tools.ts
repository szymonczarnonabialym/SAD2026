import assert from 'node:assert/strict';
// @ts-ignore Node TypeScript runner needs source extensions.
import {applyMutation,recordSchema,channelSeasonStats,type OrchardRecord,type Farm} from '../lib/orchard.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {fertilizationAdvice,limeDose} from '../lib/soil-fertilization.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {summarizeSeason,seasonRange,parseDaily,describeWeather,parseForecast,sprayConditions,frostDays} from '../lib/weather.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {treatmentPreHarvest,harvestConflicts,activePreHarvest,sprayRegister,stockPreHarvest} from '../lib/spray-records.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {backupRestore} from '../lib/backup-import.ts';

const base={note:'',version:0};
const add=(record:OrchardRecord)=>({action:'upsert' as const,requestId:crypto.randomUUID(),expectedVersion:record.version,record:recordSchema.parse(record)});
const plot={...base,id:crypto.randomUUID(),kind:'plot',date:'2020-03-01',name:'Czereśnie',variety:'Wanda',varieties:['Wanda','Regina'],initialTrees:100,area:1,plantedYear:2015,rootstock:''} as OrchardRecord;
let farm:Farm=applyMutation({records:[],appliedIds:[]},add(plot));

// Sale channels: retail and wholesale split with weighted average price; entries without a channel stay separate.
const harvest=(date:string,boxes10:number,price:number|null,saleChannel:'retail'|'wholesale'|'market'|null)=>({...base,id:crypto.randomUUID(),kind:'harvest',date,plotId:plot.id,variety:'Wanda',boxes5:0,boxes10,pricePerKg:price,saleChannel}) as OrchardRecord;
for(const h of [harvest('2026-06-20',10,12,'retail'),harvest('2026-06-21',20,6,'wholesale'),harvest('2026-06-22',5,null,'wholesale'),harvest('2026-06-23',1,10,null),harvest('2026-06-24',3,8,'market')])farm=applyMutation(farm,add(h));
const channels=channelSeasonStats(farm.records,'2026');
assert.deepEqual(channels.map(c=>[c.channel,c.kg,c.sales]),[['retail',100,1200],['wholesale',250,1200],['market',30,240],[null,10,100]]);
assert.equal(channels[1].averagePrice,6);assert.equal(channels[1].missingPrices,1);

// Fertilisation (IO 2021): light soil, low K in 0–20 cm and low K in 20–40 cm → 8–10 g K2O/m² raised by 20%.
const soil=(depth:string,values:Record<string,number>,date='2025-04-01')=>({...base,id:crypto.randomUUID(),kind:'soil',date,plotId:plot.id,depth,lab:'',soilCategory:'light',values}) as any;
let advice=fertilizationAdvice([soil('0–20 cm',{ph:5.2,p2o5:8,k2o:5,mg:4}),soil('20–40 cm',{ph:5.0,p2o5:3,k2o:3,mg:6})]);
const k=advice.nutrients.find(n=>n.parameter==='k2o')!;
assert.equal(k.topClass,'Niska');assert.equal(k.subClass,'Niska');assert.equal(k.correction,0.2);
assert.deepEqual(k.orchard,[9.6,12]);assert.deepEqual(k.planting,[180,240]);
// Phosphorus: the subsoil correction applies to pre-planting doses only; optimal P needs no dose in the orchard.
const p=advice.nutrients.find(n=>n.parameter==='p2o5')!;
assert.equal(p.topClass,'Niska');assert.deepEqual(p.orchard,[10,15]);assert.deepEqual(p.planting,[120,180]);
const mg=advice.nutrients.find(n=>n.parameter==='mg')!;
assert.equal(mg.topClass,'Optymalna');assert.equal(mg.subClass,'Wysoka');assert.deepEqual(mg.orchard,[4.8,6.4]);
// Lime from the humus-layer pH: light soil pH 5.2 → 10 kg CaO/100 m².
assert.equal(advice.lime?.dose,10);assert.equal(advice.lime?.layer,'topsoil');
assert.equal(limeDose(4.4,'heavy'),30);assert.equal(limeDose(4.5,'heavy'),20);assert.equal(limeDose(6.3,'light'),0);assert.equal(limeDose(6.8,'heavy'),5);assert.equal(limeDose(7.2,'heavy'),0);
// Only a 20–40 cm test: no base dose, but the class, correction and lime from that layer are shown.
advice=fertilizationAdvice([soil('20–40 cm',{ph:5.8,k2o:3})]);
assert.equal(advice.nutrients.find(n=>n.parameter==='k2o')!.orchard,null);
assert.equal(advice.nutrients.find(n=>n.parameter==='k2o')!.correction,0.2);
assert.equal(advice.lime?.layer,'subsoil');assert.equal(advice.lime?.dose,5);
// The latest test of each layer is used.
advice=fertilizationAdvice([soil('0–20 cm',{k2o:5},'2020-04-01'),soil('0–20 cm',{k2o:9},'2024-04-01')]);
assert.equal(advice.nutrients.find(n=>n.parameter==='k2o')!.topClass,'Optymalna');

// Weather: frosts counted only in the flowering window, harvest rain in June–July.
const days=[['2026-03-20',-5,3,0],['2026-04-10',-1,8,0],['2026-04-25',-2.5,9,0],['2026-05-25',-0.5,12,0],['2026-06-10',12,31,6],['2026-07-05',14,25,2]].map(([date,min,max,rain])=>({date,min,max,rain})) as any;
const season=summarizeSeason(2026,days,true);
assert.equal(season.frostDays,2);assert.equal(season.severeFrostDays,1);
assert.deepEqual(season.lowest,{date:'2026-04-25',min:-2.5});
assert.equal(season.harvestRain,8);assert.equal(season.rainyHarvestDays,1);assert.equal(season.hotDays,1);
assert.deepEqual(seasonRange(2026,'2026-05-10'),{start:'2026-03-01',end:'2026-05-04',complete:false});
assert.equal(seasonRange(2024,'2026-05-10').complete,true);
assert.equal(parseDaily({daily:{time:['2026-04-01'],temperature_2m_min:[null],temperature_2m_max:[5],precipitation_sum:[0]}})[0].min,null);
assert.throws(()=>parseDaily({error:true}),/Nieprawidłowa/);

// Pre-harvest intervals: catalog values for known products, own values win, the longest product counts.
const stock=(name:string,extra:object={})=>({...base,id:crypto.randomUUID(),kind:'stock',date:'2026-01-01',name,category:'protection',unit:'l',initialAmount:10,minimum:0,pricePerUnit:null,...extra}) as any;
const score=stock('Score 250 EC'),scala=stock('Scala'),own=stock('Własny środek',{preHarvestDays:{sour:21,sweet:null}}),serenade=stock('Serenade ASO');
assert.equal(stockPreHarvest(score,'sweet'),14);assert.equal(stockPreHarvest(own,'sour'),21);assert.equal(stockPreHarvest(own,'sweet'),null);
assert.equal(stockPreHarvest(stock('Score 250 EC',{preHarvestDays:{sour:10,sweet:10}}),'sweet'),10);
for(const s of [score,scala,own,serenade])farm=applyMutation(farm,add(s));
const spray=(date:string,materials:any[],fruit:'sour'|'sweet'='sweet',plotId:string|null=plot.id,extra:object={})=>({...base,id:crypto.randomUUID(),kind:'treatment',date,plotId,treatment:'Oprysk',product:'',amount:0,unit:'l',cost:0,materials,fruit,stage:null,...extra}) as any;
const s1=spray('2026-06-01',[{stockId:score.id,amount:0.2,unit:'l'},{stockId:scala.id,amount:1,unit:'l'}],'sweet',plot.id,{area:0.5,target:'drobna plamistość'});
const s2=spray('2026-06-10',[{stockId:own.id,amount:1,unit:'l'}],'sweet',null);
const s3=spray('2026-06-12',[{stockId:serenade.id,amount:1,unit:'l'}]);
for(const s of [s1,s2,s3])farm=applyMutation(farm,add(s));
const stocks=farm.records.filter(r=>r.kind==='stock') as any[];
assert.deepEqual(treatmentPreHarvest(s1,stocks),{days:14,until:'2026-06-15',unknown:[]});
assert.deepEqual(treatmentPreHarvest(s2,stocks),{days:0,until:'2026-06-10',unknown:['Własny środek']});
const conflicts=(date:string)=>harvestConflicts({id:'x',date,plotId:plot.id,variety:'Wanda'},farm.records).map(c=>c.spray.id);
assert.deepEqual(conflicts('2026-06-14'),[s1.id]);
assert.deepEqual(conflicts('2026-06-15'),[]);
assert.deepEqual(conflicts('2026-06-12'),[s1.id,s3.id]);
assert.deepEqual(harvestConflicts({id:'x',date:'2026-06-05',plotId:plot.id,variety:'Łutówka'},farm.records),[]);
assert.equal(harvestConflicts({id:'x',date:'2026-06-14',plotId:plot.id,variety:'Wanda'},farm.records)[0].names.join(),'Score 250 EC');
assert.deepEqual(activePreHarvest(farm.records,'2026-06-12').map(x=>x.spray.id),[s1.id]);
const register=sprayRegister(farm.records,'2026',()=>'Kwatera',()=>'');
assert.equal(register.length,4);
assert.deepEqual([register[0].product,register[0].dosePerHa,register[0].area,register[0].target,register[0].until],['Score 250 EC',0.4,0.5,'drobna plamistość','2026-06-15']);
assert.match(register[2].until,/bez karencji: Własny środek/);

// Backup restore adds missing entries only, parents first, and refuses entries that clash with the register.
const backup=JSON.stringify({format:'moj-sad-v1',farm});
const fresh=applyMutation({records:[],appliedIds:[]},add(plot));
const restored=backupRestore(fresh,backup);
assert.equal(restored.skipped,1);assert.equal(restored.invalid,0);
assert.equal(restored.mutations.length,farm.records.length-1);
let rebuilt=fresh;for(const m of restored.mutations)rebuilt=applyMutation(rebuilt,m);
assert.equal(rebuilt.records.length,farm.records.length);
assert.equal(backupRestore(rebuilt,backup).mutations.length,0);
assert.throws(()=>backupRestore(fresh,'{}'),/Pełna kopia/);
assert.throws(()=>backupRestore(fresh,'nie json'),/JSON/);
// Current weather: WMO codes map to icons; spraying needs wind up to 4 m/s and no rain.
assert.deepEqual(describeWeather(0),{label:'Bezchmurnie',kind:'clear'});
assert.equal(describeWeather(63).kind,'rain');assert.equal(describeWeather(81).kind,'rain');assert.equal(describeWeather(96).label,'Burza z gradem');assert.equal(describeWeather(45).kind,'fog');
const forecastJson={current:{time:'2026-04-20T08:00',temperature_2m:6.2,apparent_temperature:4,relative_humidity_2m:70,precipitation:0,weather_code:1,wind_speed_10m:2.5,wind_gusts_10m:5,is_day:1},daily:{time:['2026-04-20','2026-04-21','2026-04-22'],weather_code:[1,61,3],temperature_2m_max:[14,10,9],temperature_2m_min:[2,-1.5,0],precipitation_sum:[0,4,0],precipitation_probability_max:[10,80,null],wind_speed_10m_max:[4,6,3]}};
const fc=parseForecast(forecastJson);
assert.equal(fc.isDay,true);assert.equal(fc.days.length,3);assert.equal(fc.days[2].rainChance,null);
assert.deepEqual(sprayConditions(fc),{ok:true,reason:'wiatr 2,5 m/s, bez opadów'});
assert.equal(sprayConditions({...fc,wind:5.2}).ok,false);
assert.match(sprayConditions({...fc,code:61}).reason,/deszcz/);
assert.match(sprayConditions({...fc,days:[{...fc.days[0],rainChance:70}]}).reason,/70%/);
assert.deepEqual(frostDays(fc).map(d=>d.date),['2026-04-21','2026-04-22']);
assert.throws(()=>parseForecast({}),/Nieprawidłowa/);
console.log('PASS: sale channels, fertiliser and lime doses, season weather, pre-harvest intervals, spray register and backup restore.');
