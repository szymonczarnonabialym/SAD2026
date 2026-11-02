// Reference norms for orchard soils. Sources:
// - Instytut Ogrodnictwa–PIB (Wójcik, 2021) "Nawożenie roślin sadowniczych na podstawie analizy gleby – uaktualnienie liczb granicznych",
//   tables 6, 8, 10 (humus layer; P and K by Egner-Riehm, Mg by Schachtschabel, mg of element per kg) and table 13 (Nowosielski method).
// - Liming needs by soil category after IUNG, as reproduced in table 1 of the same document.
export type SoilCategory='very-light'|'light'|'medium'|'heavy';
export type NormTone='low'|'ok'|'high'|'warn';
export type NormClass={label:string,tone:NormTone};
export const normsSource='https://dpr.iung.pl/wp-content/uploads/gleba.pdf';
// Oxide-to-element factors: laboratories report P₂O₅ and K₂O, the orchard norms use P and K.
export const P2O5_PER_P=2.2914,K2O_PER_K=1.2046;
// Upper limits of: liming necessary, needed, advisable, limited. Above the last one liming is unnecessary.
export const phLimingLimits:Record<SoilCategory,[number,number,number,number]>={'very-light':[4.0,4.5,5.0,5.5],light:[4.5,5.0,5.5,6.0],medium:[5.0,5.5,6.0,6.5],heavy:[5.5,6.0,6.5,7.0]};
// Optimal ranges in mg of element per kg. The IO tables split K and Mg by the share of particles < 0.02 mm:
// below 20% (very light and light soils), 20–35% (medium) and above 35% (heavy; for Mg grouped with medium as ≥ 20%).
const elementOptimum={
 p2o5:{'very-light':[40,80],light:[40,80],medium:[40,80],heavy:[40,80]},
 k2o:{'very-light':[50,80],light:[50,80],medium:[80,130],heavy:[130,210]},
 mg:{'very-light':[30,50],light:[30,50],medium:[50,70],heavy:[50,70]},
} as const satisfies Record<string,Record<SoilCategory,readonly [number,number]>>;
// Layer directly below the humus layer (e.g. 20–40 cm), footnotes to IO tables 6, 8 and 10: below the lower limit the
// fertiliser dose is raised by 20%, above the upper limit lowered by 20%. For K on heavy soils the source prints "> 30",
// a misprint of 130 (the limits follow the optimum of the next lighter group, as in every other row and in table 9).
const subsoilLimits={
 p2o5:{'very-light':[20,40],light:[20,40],medium:[20,40],heavy:[20,40]},
 k2o:{'very-light':[30,50],light:[30,50],medium:[50,80],heavy:[80,130]},
 mg:{'very-light':[35,50],light:[35,50],medium:[50,70],heavy:[50,70]},
} as const satisfies Record<string,Record<SoilCategory,readonly [number,number]>>;
export type NormParameter=keyof typeof elementOptimum;
export type SoilLayer='topsoil'|'subsoil';
const factor:Record<NormParameter,number>={p2o5:P2O5_PER_P/10,k2o:K2O_PER_K/10,mg:1/10};
export const isNormParameter=(key:string):key is NormParameter=>key in elementOptimum;
const limits=(layer:SoilLayer)=>layer==='topsoil'?elementOptimum:subsoilLimits;
/** Norm range converted to the units used in the app (mg P₂O₅, K₂O or Mg per 100 g). */
export function nutrientOptimum(parameter:NormParameter,category:SoilCategory,layer:SoilLayer='topsoil'):[number,number]{
 const [low,high]=limits(layer)[parameter][category];
 return [low*factor[parameter],high*factor[parameter]];
}
/** Samples starting at 0 cm (or without depth) are the humus layer; deeper ones, e.g. 20–40 cm, the layer below it. */
export const isTopsoil=(depth:string)=>{const d=depth.trim();return d===''||/^0\D/.test(d)||d==='0'};
export const soilLayer=(depth:string):SoilLayer=>isTopsoil(depth)?'topsoil':'subsoil';
export function phClass(value:number,category:SoilCategory):NormClass{
 const [necessary,needed,advisable,limited]=phLimingLimits[category];
 if(value<necessary)return {label:'Wapnowanie konieczne',tone:'low'};
 if(value<=needed)return {label:'Wapnowanie potrzebne',tone:'low'};
 if(value<=advisable)return {label:'Wapnowanie wskazane',tone:'warn'};
 if(value<=limited)return {label:'Wapnowanie ograniczone',tone:'ok'};
 return {label:'Wapnowanie zbędne',tone:'ok'};
}
export function nutrientClass(parameter:NormParameter,value:number,category:SoilCategory,layer:SoilLayer='topsoil'):NormClass{
 const [low,high]=limits(layer)[parameter][category],element=value/factor[parameter];
 // Compare in the source units so that the published limits stay exact.
 const rounded=Math.round(element*1000)/1000;
 return rounded<low?{label:'Niska',tone:'low'}:rounded>high?{label:'Wysoka',tone:'high'}:{label:layer==='topsoil'?'Optymalna':'Średnia',tone:'ok'};
}
export function soilNorm(parameter:string,value:number,category:SoilCategory|null|undefined,depth:string):NormClass|null{
 const layer=soilLayer(depth);
 if(parameter==='p2o5')return nutrientClass('p2o5',value,category??'medium',layer);
 if(!category)return null;
 if(parameter==='ph')return phClass(value,category);
 return isNormParameter(parameter)?nutrientClass(parameter,value,category,layer):null;
}
// IO table 13: optimal ranges in the humus layer of orchard soil, Nowosielski method, mg per dm³.
// Not comparable with mg/kg results of the 1 M HCl or Mehlich 3 methods, so shown for reference only.
export const nowosielskiOptimum=[
 {label:'Wapń (Ca)',range:'600–1000'},{label:'Żelazo (Fe)',range:'70–140'},{label:'Mangan (Mn)',range:'5–12'},
 {label:'Cynk (Zn)',range:'2,8–5,4'},{label:'Miedź (Cu)',range:'1,8–5,1'},{label:'Bor (B)',range:'0,3–0,9'},
];
