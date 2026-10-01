import { z } from 'zod';
export const varieties = ['Łutówka','Wanda','Vega','Techlovan','Burlat','Cordia','Ulster','Regina'] as const;
export const treatments = ['Nawożenie','Podlewanie','Oprysk','Cięcie','Koszenie','Przerzedzanie','Odchwaszczanie','Inny zabieg'] as const;
export const activeTreatments = ['Oprysk','Nawożenie','Podlewanie'] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Nieprawidłowa data');
const base = {id:z.string().uuid(),date,version:z.number().int().nonnegative(),note:z.string().max(2000).default('')};
const variety = z.enum(varieties);
const count=z.number().int().min(0).max(1000000);
const num=z.number().min(0).max(100000000);
const stockUnit=z.enum(['kg','l']);
const materialSchema=z.object({stockId:z.string().uuid(),amount:num.positive(),unit:stockUnit});
export const recordSchema = z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('plot'),name:z.string().trim().min(1).max(100),variety,varieties:z.array(variety).min(1).max(8).optional(),area:z.number().min(0).max(100000),initialTrees:count,plantedYear:z.number().int().min(1900).max(2200).nullable(),rootstock:z.string().max(100).default('')}),
 z.object({...base,kind:z.literal('harvest'),plotId:z.string().uuid().nullable(),variety,boxes5:count,boxes10:count,weightKg:num.nullable().optional(),pricePerKg:num.nullable().optional()}),
 z.object({...base,kind:z.literal('treatment'),plotId:z.string().uuid().nullable(),treatment:z.enum(treatments),product:z.string().max(200),amount:num,unit:z.enum(['kg','l','g','ml','m³','godz.']),cost:num,materials:z.array(materialSchema).max(20).optional(),fruit:z.enum(['sour','sweet']).nullable().optional(),stage:z.string().max(160).nullable().optional()}),
 z.object({...base,kind:z.literal('stock'),name:z.string().trim().min(1).max(160),category:z.enum(['protection','fertilizer']),unit:stockUnit,initialAmount:num,minimum:num.default(0),pricePerUnit:num.nullable().optional()}),
 z.object({...base,kind:z.literal('purchase'),stockId:z.string().uuid(),amount:num.positive(),unit:stockUnit,pricePerUnit:num.nullable().optional()}),
 z.object({...base,kind:z.literal('plan'),plotId:z.string().uuid().nullable(),name:z.string().trim().min(1).max(160),fruit:z.enum(['sour','sweet']),stage:z.string().max(160).nullable().optional(),leadDays:z.number().int().min(0).max(30).default(7),completed:z.boolean().default(false)}),
 z.object({...base,kind:z.literal('trees'),plotId:z.string().uuid(),treeChange:z.number().int().min(-1000000).max(1000000).refine(v=>v!==0)}),
 z.object({...base,kind:z.literal('observation'),plotId:z.string().uuid().nullable(),name:z.string().trim().min(1).max(160)})
]);
export type OrchardRecord=z.infer<typeof recordSchema>;
export type Plot=Extract<OrchardRecord,{kind:'plot'}>;
export type Harvest=Extract<OrchardRecord,{kind:'harvest'}>;
export type Stock=Extract<OrchardRecord,{kind:'stock'}>;
export type Plan=Extract<OrchardRecord,{kind:'plan'}>;
export type Fruit='sour'|'sweet';
export type Kind=OrchardRecord['kind'];
export type Farm={records:OrchardRecord[],appliedIds:string[]};
export const mutationSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('upsert'),requestId:z.string().uuid(),record:recordSchema,expectedVersion:z.number().int().nonnegative()}),
 z.object({action:z.literal('delete'),requestId:z.string().uuid(),id:z.string().uuid(),expectedVersion:z.number().int().positive()})
]);
export type Mutation=z.infer<typeof mutationSchema>;
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw'}).format(new Date())}
export function weight(r:OrchardRecord){return r.kind==='harvest'?(r.weightKg??(r.boxes5*5+r.boxes10*10)):0}
export function saleValue(r:OrchardRecord){return r.kind==='harvest'&&r.pricePerKg!=null?Math.round((weight(r)*r.pricePerKg+Number.EPSILON)*100)/100:0}
export function harvestMatches(r:OrchardRecord,fruit:string,variety='all'){return r.kind==='harvest'&&(fruit==='sour'?r.variety==='Łutówka':r.variety!=='Łutówka'&&(variety==='all'||r.variety===variety))}
// Old single-variety plots remain readable without rewriting saved records.
export function plotVarieties(p:Plot){return p.varieties??[p.variety]}
export function fruitFor(variety:string):Fruit{return variety==='Łutówka'?'sour':'sweet'}
export function plotFruit(p:Plot):Fruit{return fruitFor(p.variety)}
export function seasonStats(records:OrchardRecord[],year:string,plotId='all'){
 const inScope=(r:OrchardRecord)=>r.date.slice(0,4)===year&&(plotId==='all'||('plotId'in r&&(plotId==='none'?r.plotId===null:r.plotId===plotId)));
 const harvests=records.filter((r):r is Harvest=>r.kind==='harvest'&&inScope(r));
 const fruitStats=(fruit:Fruit)=>{
  const entries=harvests.filter(r=>fruitFor(r.variety)===fruit),priced=entries.filter(r=>r.pricePerKg!=null);
  return {kg:entries.reduce((s,r)=>s+weight(r),0),boxes5:entries.reduce((s,r)=>s+r.boxes5,0),boxes10:entries.reduce((s,r)=>s+r.boxes10,0),sales:Math.round(priced.reduce((s,r)=>s+saleValue(r),0)*100)/100,missingPrices:entries.length-priced.length,entries:entries.length};
 };
 const sour=fruitStats('sour'),sweet=fruitStats('sweet');
 const costs=Math.round(records.reduce((s,r)=>s+(r.kind==='treatment'&&inScope(r)?r.cost:0),0)*100)/100;
 const sales=Math.round((sour.sales+sweet.sales)*100)/100;
 return {sour,sweet,sales,costs,result:Math.round((sales-costs)*100)/100,missingPrices:sour.missingPrices+sweet.missingPrices};
}
export function changeFrom(previous:number,current:number){return {kg:current-previous,percent:previous>0?(current-previous)/previous*100:null}}
export function compareSeasons(records:OrchardRecord[],previousYear:string,currentYear:string,plotId='all'){
 const previous=seasonStats(records,previousYear,plotId),current=seasonStats(records,currentYear,plotId);
 return {previous,current,sour:changeFrom(previous.sour.kg,current.sour.kg),sweet:changeFrom(previous.sweet.kg,current.sweet.kg)};
}
const roundQuantity=(n:number)=>Math.round(n*1000000)/1000000;
export function usedStock(stockId:string,records:OrchardRecord[],year?:string){return roundQuantity(records.reduce((s,r)=>s+(r.kind==='treatment'&&(!year||r.date.slice(0,4)===year)?(r.materials??[]).filter(m=>m.stockId===stockId).reduce((a,m)=>a+m.amount,0):0),0))}
export function stockBalance(stock:Stock,records:OrchardRecord[]){return roundQuantity(stock.initialAmount+records.reduce((s,r)=>s+(r.kind==='purchase'&&r.stockId===stock.id?r.amount:0),0)-usedStock(stock.id,records))}
export function stockCosts(stock:Stock,records:OrchardRecord[]){
 const purchases=records.filter(r=>r.kind==='purchase'&&r.stockId===stock.id);
 const lots=[{amount:stock.initialAmount,price:stock.pricePerUnit},...purchases.map(r=>({amount:r.kind==='purchase'?r.amount:0,price:r.kind==='purchase'?r.pricePerUnit:null}))];
 const priced=lots.filter(l=>l.price!=null&&l.amount>0),pricedAmount=priced.reduce((s,l)=>s+l.amount,0);
 const paid=Math.round(priced.reduce((s,l)=>s+l.amount*l.price!,0)*100)/100;
 const missingPrices=lots.filter(l=>l.amount>0&&l.price==null).length;
 const average=pricedAmount>0?paid/pricedAmount:null;
 return {paid,average,missingPrices,estimatedValue:average!=null&&missingPrices===0?Math.round(stockBalance(stock,records)*average*100)/100:null};
}
export function shoppingList(records:OrchardRecord[],year:string){return records.filter((r):r is Stock=>r.kind==='stock').map(stock=>{const used=usedStock(stock.id,records,year),balance=stockBalance(stock,records);return {stock,used,balance,toBuy:roundQuantity(Math.max(0,used-balance))}})}
export function reminderStarts(plan:Plan){return new Date(Date.parse(plan.date+'T12:00:00Z')-plan.leadDays*86400000).toISOString().slice(0,10)}
export function duePlans(records:OrchardRecord[],onDate=today()){return records.filter((r):r is Plan=>r.kind==='plan'&&!r.completed&&reminderStarts(r)<=onDate).sort((a,b)=>a.date.localeCompare(b.date))}
export function treesFor(p:Plot,records:OrchardRecord[]){return p.initialTrees+records.reduce((n,r)=>n+(r.kind==='trees'&&r.plotId===p.id?r.treeChange:0),0)}
export function applyMutation(farm:Farm,m:Mutation):Farm{
 if(farm.appliedIds.includes(m.requestId))return farm;
 const id=m.action==='delete'?m.id:m.record.id;
 const prev=farm.records.find(r=>r.id===id);
 if((prev?.version??0)!==m.expectedVersion)throw new Error('Ten wpis zmienił się na innym urządzeniu. Odśwież dane i popraw wpis ponownie.');
 if(m.action==='delete'&&!prev)throw new Error('Nie znaleziono wpisu.');
 if(m.action==='upsert'&&prev&&prev.kind!==m.record.kind)throw new Error('Nie można zmienić rodzaju wpisu.');
 const next=farm.records.filter(r=>r.id!==id);
 if(m.action==='upsert')next.push({...m.record,version:m.expectedVersion+1});
 const plots=next.filter((r):r is Plot=>r.kind==='plot');
 const stocks=next.filter((r):r is Stock=>r.kind==='stock');
 for(const p of plots){
  const selected=plotVarieties(p);
  if(new Set(selected).size!==selected.length||!selected.includes(p.variety)||selected.some(v=>fruitFor(v)!==plotFruit(p)))throw new Error('Wybierz odmiany jednego gatunku dla kwatery: wiśnie albo czereśnie.');
 }
 for(const r of next){
  if('plotId' in r&&r.plotId){
   const p=plots.find(p=>p.id===r.plotId);
   if(!p)throw new Error('Kwatera ma powiązane wpisy lub już nie istnieje.');
   if(r.kind==='harvest'&&!plotVarieties(p).includes(r.variety))throw new Error('Odmiana zbioru musi należeć do kwatery. Nie usuwaj odmiany z zapisanymi zbiorami.');
   if((r.kind==='plan'||r.kind==='treatment')&&r.fruit&&r.fruit!==plotFruit(p))throw new Error('Gatunek zabiegu musi zgadzać się z kwaterą.');
  }
  if(r.kind==='purchase'){
   const stock=stocks.find(s=>s.id===r.stockId);if(!stock)throw new Error('Środek ma powiązane zakupy lub już nie istnieje.');
   if(stock.unit!==r.unit)throw new Error('Jednostka zakupu musi zgadzać się ze środkiem w magazynie.');
  }
  if(r.kind==='treatment'&&r.materials?.length){
   if(!['Oprysk','Nawożenie'].includes(r.treatment))throw new Error('Środki z magazynu przypisz do oprysku lub nawożenia.');
   if(new Set(r.materials.map(m=>m.stockId)).size!==r.materials.length)throw new Error('Wpisz każdy środek tylko raz w jednym zabiegu.');
   for(const m of r.materials){const stock=stocks.find(s=>s.id===m.stockId);if(!stock)throw new Error('Środek ma powiązane zabiegi lub już nie istnieje.');if(stock.unit!==m.unit)throw new Error('Nie zmieniaj jednostki środka z zapisanym zużyciem.');}
  }
  if(r.kind==='harvest'){
   if(r.weightKg!=null&&(r.variety!=='Łutówka'||r.boxes5!==0||r.boxes10!==0))throw new Error('Kilogramy wpisuj dla wiśni, zamiast liczby skrzynek.');
   if(weight(r)<=0)throw new Error(r.weightKg!=null?'Wpisz dodatnią liczbę kilogramów.':'Wpisz co najmniej jedną skrzynkę.');
  }
 }
 for(const p of plots){if(treesFor(p,next)<0)throw new Error('Liczba usuniętych drzew przekracza stan kwatery.');}
 for(const stock of stocks){if(stockBalance(stock,next)<0)throw new Error(`Za mało środka „${stock.name}” w magazynie. Dodaj zakup lub popraw ilość zużycia.`);}
 const result={records:next,appliedIds:[...farm.appliedIds,m.requestId].slice(-500)};
 if(new TextEncoder().encode(JSON.stringify(result)).length>1500000)throw new Error('Rejestr osiągnął pojemność tej wersji. Wyeksportuj dane i skontaktuj się w sprawie rozszerzenia.');
 return result;
}
