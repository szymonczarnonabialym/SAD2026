// Fertiliser and lime doses after Instytut Ogrodnictwa–PIB (Wójcik, 2021), tables 6, 8, 10 and 12.
// The class of the humus layer sets the dose; the layer below it (e.g. 20–40 cm) raises it by 20% when its
// content is low and lowers it by 20% when high.
// @ts-ignore Node TypeScript runner needs source extensions.
import {soilLayer,nutrientClass,type SoilCategory,type NormParameter} from './soil-norms.ts';
import type {SoilTest} from './soil';

type Range=readonly [number,number];
type ClassDoses={low:Range,ok:Range,high:Range};
const byGroup=(light:ClassDoses,medium:ClassDoses,heavy:ClassDoses):Record<SoilCategory,ClassDoses>=>({'very-light':light,light,medium,heavy});
const none:Range=[0,0];
// g of oxide per m² of fertilised area in an existing orchard.
const orchardDoses:Record<NormParameter,Record<SoilCategory,ClassDoses>>={
 p2o5:byGroup({low:[10,15],ok:none,high:none},{low:[10,15],ok:none,high:none},{low:[10,15],ok:none,high:none}),
 k2o:byGroup({low:[8,10],ok:[5,8],high:none},{low:[10,12],ok:[8,10],high:none},{low:[12,16],ok:[10,12],high:none}),
 mg:byGroup({low:[8,10],ok:[6,8],high:none},{low:[10,12],ok:[8,10],high:none},{low:[10,12],ok:[8,10],high:none}),
};
// kg of oxide per ha of fertilised area before planting.
const plantingDoses:Record<NormParameter,Record<SoilCategory,ClassDoses>>={
 p2o5:byGroup({low:[100,150],ok:[50,100],high:[0,50]},{low:[100,150],ok:[50,100],high:[0,50]},{low:[100,150],ok:[50,100],high:[0,50]}),
 k2o:byGroup({low:[150,200],ok:[100,150],high:none},{low:[200,250],ok:[150,200],high:none},{low:[250,300],ok:[200,250],high:none}),
 mg:byGroup({low:[80,100],ok:[60,80],high:none},{low:[100,120],ok:[80,100],high:none},{low:[100,120],ok:[80,100],high:none}),
};
// In table 6 the subsoil correction for phosphorus is attached to the pre-planting doses only.
const correctsOrchardDose:Record<NormParameter,boolean>={p2o5:false,k2o:true,mg:true};
export const nutrientNames:Record<NormParameter,string>={p2o5:'Fosfor (P₂O₅)',k2o:'Potas (K₂O)',mg:'Magnez (MgO)'};

// Table 12: one-off lime doses in kg CaO per 100 m², applied in strips along the rows every 3–4 years.
// The table has no very light soils; they use the light-soil column.
const limeRows:{maxPh:number,doses:[number,number,number]}[]=[
 {maxPh:4.49,doses:[17,20,30]},{maxPh:5.5,doses:[10,15,20]},{maxPh:6.0,doses:[5,8,15]},{maxPh:6.5,doses:[0,5,10]},{maxPh:7.0,doses:[0,0,5]},
];
export function limeDose(ph:number,category:SoilCategory){
 const column=category==='heavy'?2:category==='medium'?1:0;
 return limeRows.find(row=>Math.round(ph*100)/100<=row.maxPh)?.doses[column]??0;
}

const scale=(range:Range,factor:number):[number,number]=>[Math.round(range[0]*factor*10)/10,Math.round(range[1]*factor*10)/10];
const classKey=(label:string)=>label==='Niska'?'low':label==='Wysoka'?'high':'ok';
const latest=(tests:SoilTest[],layer:'topsoil'|'subsoil')=>tests.filter(t=>soilLayer(t.depth)===layer).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)??null;

export type NutrientAdvice={parameter:NormParameter,topClass:string|null,subClass:string|null,correction:number,orchard:[number,number]|null,planting:[number,number]|null};
/** Advice for one sampling place (usually a plot) from its latest humus-layer and subsoil tests. */
export function fertilizationAdvice(tests:SoilTest[]){
 const top=latest(tests,'topsoil'),sub=latest(tests,'subsoil');
 const category:SoilCategory|null=top?.soilCategory??sub?.soilCategory??null;
 const nutrients:NutrientAdvice[]=(['p2o5','k2o','mg'] as NormParameter[]).map(parameter=>{
  const needsCategory=parameter!=='p2o5',cat=category??'medium';
  const topValue=top?.values[parameter],subValue=sub?.values[parameter];
  const topClass=topValue!=null&&(!needsCategory||category)?nutrientClass(parameter,topValue,cat,'topsoil').label:null;
  const subClass=subValue!=null&&(!needsCategory||category)?nutrientClass(parameter,subValue,cat,'subsoil').label:null;
  const correction=subClass==='Niska'?0.2:subClass==='Wysoka'?-0.2:0;
  if(!topClass)return {parameter,topClass,subClass,correction,orchard:null,planting:null};
  const key=classKey(topClass);
  return {parameter,topClass,subClass,correction,
   orchard:scale(orchardDoses[parameter][cat][key],1+(correctsOrchardDose[parameter]?correction:0)),
   planting:scale(plantingDoses[parameter][cat][key],1+correction)};
 });
 const phTest=top?.values.ph!=null?top:sub?.values.ph!=null?sub:null;
 const lime=phTest&&category?{ph:phTest.values.ph!,layer:soilLayer(phTest.depth),dose:limeDose(phTest.values.ph!,category)}:null;
 return {top,sub,category,nutrients,lime};
}
