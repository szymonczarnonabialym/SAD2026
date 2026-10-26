// @ts-ignore Node's TypeScript runner requires source extensions.
import {type OrchardRecord,type Stock} from './orchard.ts';

export function treatmentTitle(record:Extract<OrchardRecord,{kind:'treatment'}>,stocks:Stock[]){
 const names=[...new Set([
  ...(record.materials??[]).flatMap(material=>{
   const stock=stocks.find(s=>s.id===material.stockId);
   return stock?[stock.name]:[];
  }),
  ...(record.product.trim()?[record.product.trim()]:[]),
 ])];
 return names.length?`${record.treatment} — ${names.join(', ')}`:record.treatment;
}
