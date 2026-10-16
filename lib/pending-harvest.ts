// @ts-ignore Node TypeScript test runner requires the extension.
import {applyMutation,recordSchema,type Farm,type Mutation,type OrchardRecord} from './orchard.ts';

export function correctPendingHarvest(farm:Farm,pending:Mutation[],requestId:string,record:OrchardRecord){
 const index=pending.findIndex(m=>m.requestId===requestId),old=pending[index];
 if(!old||old.action!=='upsert'||old.record.kind!=='harvest'||record.kind!=='harvest'||record.id!==old.record.id)throw new Error('Nie znaleziono oczekującego zbioru. Odśwież dane.');
 if(farm.appliedIds.includes(requestId))throw new Error('Ten wpis został już zapisany. Odśwież dane przed edycją.');
 const replacement:Mutation={...old,requestId:crypto.randomUUID(),record:recordSchema.parse({...record,version:old.expectedVersion})};
 let before=farm;
 for(const earlier of pending.slice(0,index))before=applyMutation(before,earlier);
 applyMutation(before,replacement);
 return pending.map((m,i)=>i===index?replacement:m);
}
