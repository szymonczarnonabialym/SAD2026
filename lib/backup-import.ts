// Restoring a "Pełna kopia danych" file: only entries missing from the current register are added, nothing is overwritten.
// @ts-ignore Node TypeScript runner needs source extensions.
import {applyMutation,recordSchema,type Farm,type Kind,type Mutation,type OrchardRecord} from './orchard.ts';

// Parents first, so that harvests, purchases and treatments find their plots and stock items.
const order:Kind[]=['plot','stock','purchase','harvest','treatment','trees','observation','plan','soil'];
export function backupRestore(farm:Farm,content:string,newId:()=>string=()=>crypto.randomUUID()){
 let json:unknown;
 try{json=JSON.parse(content)}catch{throw new Error('To nie jest plik kopii Mój Sad (nieprawidłowy JSON).')}
 const backup=json as {format?:string,farm?:{records?:unknown[]}};
 if(backup?.format!=='moj-sad-v1'||!Array.isArray(backup.farm?.records))throw new Error('To nie jest plik „Pełna kopia danych” z aplikacji Mój Sad.');
 const existing=new Set(farm.records.map(r=>r.id));
 let invalid=0;
 const records=backup.farm.records.flatMap(raw=>{const parsed=recordSchema.safeParse(raw);if(!parsed.success){invalid++;return []}return [parsed.data]});
 const missing=records.filter(r=>!existing.has(r.id)).sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind)||a.date.localeCompare(b.date));
 const mutations:Mutation[]=missing.map((record:OrchardRecord)=>({action:'upsert',requestId:newId(),record:{...record,version:0},expectedVersion:0}));
 // Validate the whole batch against the current register before anything is queued.
 let next=farm;
 for(const m of mutations){try{next=applyMutation(next,m)}catch(e){const r=(m as Extract<Mutation,{action:'upsert'}>).record;throw new Error(`Wpis z ${r.date} (${r.kind}) nie pasuje do obecnego rejestru: ${(e as Error).message}`)}}
 return {mutations,skipped:records.length-missing.length,invalid};
}
