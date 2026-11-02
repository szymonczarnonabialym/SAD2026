// Pre-harvest intervals of recorded sprays and the plant protection register (ewidencja zabiegów).
// @ts-ignore Node TypeScript runner needs source extensions.
import {fruitFor,type OrchardRecord,type Stock,type Harvest,type Fruit} from './orchard.ts';
// @ts-ignore Node TypeScript runner needs source extensions.
import {catalogPreHarvest} from './protection-products.ts';

type Treatment=Extract<OrchardRecord,{kind:'treatment'}>;
const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);

/** Days entered for the stock item, otherwise the built-in catalog value for a known product name. */
export function stockPreHarvest(stock:Stock,fruit:Fruit):number|null{
 const own=stock.preHarvestDays?.[fruit];
 if(own!==undefined)return own;
 return catalogPreHarvest(stock.name)?.[fruit]??null;
}
export type PreHarvest={days:number,until:string,unknown:string[]};
/** The longest interval among the protection products used. Harvest is allowed from `until` on. */
export function treatmentPreHarvest(t:Treatment,stocks:Stock[]):PreHarvest|null{
 if(t.treatment!=='Oprysk')return null;
 const used=(t.materials??[]).map(m=>stocks.find(s=>s.id===m.stockId)).filter((s):s is Stock=>!!s&&s.category==='protection');
 if(!used.length)return null;
 const fruit=t.fruit??'sour',known:number[]=[],unknown:string[]=[];
 for(const s of used){const d=stockPreHarvest(s,fruit);if(d==null)unknown.push(s.name);else known.push(d)}
 const days=known.length?Math.max(...known):0;
 return {days,until:shift(t.date,days),unknown};
}
const sprays=(records:OrchardRecord[])=>records.filter((r):r is Treatment=>r.kind==='treatment'&&r.treatment==='Oprysk');
const stocksOf=(records:OrchardRecord[])=>records.filter((r):r is Stock=>r.kind==='stock');
// A spray without a plot covers the whole orchard; a harvest without a plot is checked against every spray.
const samePlace=(spray:Treatment,plotId:string|null)=>spray.plotId===null||plotId===null||spray.plotId===plotId;

export type Conflict={spray:Treatment,until:string,names:string[]};
/** Sprays whose pre-harvest interval was still running on the harvest day. A 0-day interval forbids same-day harvest. */
export function harvestConflicts(harvest:Pick<Harvest,'date'|'plotId'|'variety'|'id'>,records:OrchardRecord[]):Conflict[]{
 const stocks=stocksOf(records),fruit=fruitFor(harvest.variety);
 return sprays(records).flatMap(s=>{
  if((s.fruit??'sour')!==fruit||!samePlace(s,harvest.plotId)||s.date>harvest.date)return [];
  const p=treatmentPreHarvest(s,stocks);
  if(!p||!(harvest.date<p.until||harvest.date===s.date))return [];
  const names=(s.materials??[]).map(m=>stocks.find(x=>x.id===m.stockId)).filter((x):x is Stock=>{const d=x?.category==='protection'?stockPreHarvest(x,fruit):null;return d!=null&&(harvest.date<shift(s.date,d)||harvest.date===s.date)}).map(x=>x.name);
  return [{spray:s,until:p.until,names}];
 });
}
/** Intervals still running on the given day, latest end first. */
export function activePreHarvest(records:OrchardRecord[],onDate:string){
 const stocks=stocksOf(records);
 return sprays(records).map(s=>({spray:s,p:treatmentPreHarvest(s,stocks)})).filter((x):x is {spray:Treatment,p:PreHarvest}=>!!x.p&&x.spray.date<=onDate&&x.p.until>onDate).sort((a,b)=>b.p.until.localeCompare(a.p.until));
}

export type RegisterRow={date:string,crop:string,plot:string,area:number|null,product:string,dosePerHa:number|null,amount:number|null,unit:string,target:string,stage:string,until:string,note:string};
/** One row per product used, as kept in the plant protection register. */
export function sprayRegister(records:OrchardRecord[],year:string,plotName:(id:string|null)=>string,stageName:(s:string|null|undefined)=>string):RegisterRow[]{
 const stocks=stocksOf(records);
 return sprays(records).filter(s=>s.date.slice(0,4)===year).sort((a,b)=>a.date.localeCompare(b.date)).flatMap((s):RegisterRow[]=>{
  const p=treatmentPreHarvest(s,stocks),crop=(s.fruit??'sour')==='sour'?'Wiśnia':'Czereśnia';
  const common={date:s.date,crop,plot:plotName(s.plotId),area:s.area??null,target:s.target??'',stage:stageName(s.stage),until:p?(p.unknown.length?p.until+' (bez karencji: '+p.unknown.join(', ')+')':p.until):'',note:s.note};
  const used=(s.materials??[]).map(m=>({m,stock:stocks.find(x=>x.id===m.stockId)})).filter(x=>x.stock?.category==='protection');
  if(!used.length)return [{...common,product:s.product,dosePerHa:null,amount:s.amount||null,unit:s.unit}];
  return used.map(({m,stock})=>({...common,product:stock!.name,amount:m.amount,unit:m.unit,dosePerHa:s.area?Math.round(m.amount/s.area*1000)/1000:null}));
 });
}
