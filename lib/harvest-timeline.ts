// @ts-ignore Node's built-in TypeScript runner requires the source extension.
import {weight,fruitFor,plotVarieties,type OrchardRecord} from './orchard.ts';

export function harvestTimeline(records:OrchardRecord[],currentYear:string,plotId='all'){
 const inScope=(id:string|null)=>plotId==='all'||(plotId==='none'?id===null:id===plotId);
 const harvests=records.filter(r=>r.kind==='harvest'&&inScope(r.plotId)&&r.date.slice(0,4)!=='2025');
 const names=Array.from(new Set([
  ...records.flatMap(r=>r.kind==='plot'&&inScope(r.id)?plotVarieties(r):[]),
  ...harvests.map(r=>r.kind==='harvest'?r.variety:'Łutówka'),
 ])).filter(v=>v!=='Łutówka').sort((a,b)=>a.localeCompare(b,'pl'));
 const seasons=[Number(currentYear),...harvests.map(r=>Number(r.date.slice(0,4)))].filter(y=>y!==2025);
 const first=Math.min(...seasons),last=Math.max(...seasons);
 const data=Array.from({length:last-first+1},(_,i)=>first+i).filter(y=>y!==2025).map(year=>{
  const row:Record<string,number|null>={year,sour:null,sweet:null};
  names.forEach((_,i)=>{row['v'+i]=null});
  for(const r of harvests)if(r.kind==='harvest'&&Number(r.date.slice(0,4))===year){
   const fruit=fruitFor(r.variety),kg=weight(r);row[fruit]=(row[fruit]??0)+kg;
   if(fruit==='sweet'){const key='v'+names.indexOf(r.variety);row[key]=(row[key]??0)+kg}
  }
  return row;
 });
 return {data,names,hasHarvests:harvests.length>0};
}
