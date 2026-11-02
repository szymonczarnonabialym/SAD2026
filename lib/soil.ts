import { z } from 'zod';
import type {OrchardRecord} from './orchard';

// Units follow typical reports of Polish agrochemical stations (OSChR); values from other units must be converted before saving.
export const soilParameters=[
 {key:'ph',label:'Odczyn pH (KCl)',short:'pH',unit:'',max:14,main:true},
 {key:'p2o5',label:'Fosfor (P₂O₅)',short:'P₂O₅',unit:'mg/100 g',max:100000,main:true},
 {key:'k2o',label:'Potas (K₂O)',short:'K₂O',unit:'mg/100 g',max:100000,main:true},
 {key:'mg',label:'Magnez (Mg)',short:'Mg',unit:'mg/100 g',max:100000,main:true},
 {key:'organic',label:'Próchnica / materia organiczna',short:'Próchnica',unit:'%',max:100,main:true},
 {key:'nmin',label:'Azot mineralny (N-min)',short:'N-min',unit:'kg N/ha',max:100000,main:false},
 {key:'ca',label:'Wapń (Ca)',short:'Ca',unit:'mg/kg',max:1000000,main:false},
 {key:'b',label:'Bor (B)',short:'B',unit:'mg/kg',max:100000,main:false},
 {key:'cu',label:'Miedź (Cu)',short:'Cu',unit:'mg/kg',max:100000,main:false},
 {key:'mn',label:'Mangan (Mn)',short:'Mn',unit:'mg/kg',max:100000,main:false},
 {key:'zn',label:'Cynk (Zn)',short:'Zn',unit:'mg/kg',max:100000,main:false},
 {key:'fe',label:'Żelazo (Fe)',short:'Fe',unit:'mg/kg',max:1000000,main:false},
] as const;
export type SoilParameter=typeof soilParameters[number]['key'];
export const soilCategories=[{value:'very-light',label:'Bardzo lekka'},{value:'light',label:'Lekka'},{value:'medium',label:'Średnia'},{value:'heavy',label:'Ciężka'}] as const;
export const soilDepths=['0–20 cm','20–40 cm','0–30 cm','30–60 cm'];
const measure=(max:number)=>z.number().min(0).max(max).nullable().optional();
export const soilValuesSchema=z.object({ph:measure(14),p2o5:measure(100000),k2o:measure(100000),mg:measure(100000),organic:measure(100),nmin:measure(100000),ca:measure(1000000),b:measure(100000),cu:measure(100000),mn:measure(100000),zn:measure(100000),fe:measure(1000000)});
export type SoilValues=z.infer<typeof soilValuesSchema>;
export type SoilTest=Extract<OrchardRecord,{kind:'soil'}>;
export const soilCategoryLabel=(value:string|null|undefined)=>soilCategories.find(c=>c.value===value)?.label??'';
export const soilParameter=(key:SoilParameter)=>soilParameters.find(p=>p.key===key)!;
export function hasSoilValues(values:SoilValues){return soilParameters.some(p=>values[p.key]!=null)}
export function soilSummary(test:SoilTest){return soilParameters.filter(p=>test.values[p.key]!=null).map(p=>`${p.short} ${new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(test.values[p.key]!)}${p.unit?' '+p.unit:''}`).join(' · ')}
// One series is one sampling place: the plot together with the sampling depth.
export const soilSeriesKey=(test:SoilTest)=>(test.plotId??'none')+'|'+test.depth.trim();
export function soilTests(records:OrchardRecord[],plotId='all'){
 return records.filter((r):r is SoilTest=>r.kind==='soil'&&(plotId==='all'||(plotId==='none'?r.plotId===null:r.plotId===plotId))).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
/** Earlier test from the same plot and depth, used to show the change between consecutive tests. */
export function previousSoilTest(tests:SoilTest[],test:SoilTest){
 const earlier=tests.filter(t=>t.id!==test.id&&soilSeriesKey(t)===soilSeriesKey(test)&&(t.date<test.date||(t.date===test.date&&t.id<test.id)));
 return earlier.at(-1)??null;
}
/** Yearly values of one parameter; several tests from one year and place are averaged. Years without tests stay empty. */
export function soilTimeline(records:OrchardRecord[],parameter:SoilParameter,plotId='all',seriesName:(test:SoilTest)=>string=t=>t.depth){
 const tests=soilTests(records,plotId).filter(t=>t.values[parameter]!=null);
 const keys=Array.from(new Set(tests.map(soilSeriesKey)));
 const series=keys.map((key,i)=>({key:'s'+i,name:seriesName(tests.find(t=>soilSeriesKey(t)===key)!)}));
 if(!tests.length)return {data:[] as Record<string,number|null>[],series,count:0};
 const years=tests.map(t=>Number(t.date.slice(0,4))),first=Math.min(...years),last=Math.max(...years);
 const data=Array.from({length:last-first+1},(_,i)=>first+i).map(year=>{
  const row:Record<string,number|null>={year};
  keys.forEach((key,i)=>{
   const values=tests.filter(t=>soilSeriesKey(t)===key&&Number(t.date.slice(0,4))===year).map(t=>t.values[parameter]!);
   row['s'+i]=values.length?Math.round(values.reduce((s,v)=>s+v,0)/values.length*100)/100:null;
  });
  return row;
 });
 return {data,series,count:tests.length};
}
