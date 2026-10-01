import { getChatGPTUser } from '@/app/chatgpt-auth';
import { farmDb } from '@/db/farm';
import {applyMutation,mutationSchema,type Farm} from '@/lib/orchard';
const empty:Farm={records:[],appliedIds:[]};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Zaloguj się, aby otworzyć rejestr.'},401);
 try{const row=await farmDb().prepare('SELECT data, revision FROM farms WHERE owner = ?').bind(user.userId).first<{data:string,revision:number}>();return json({farm:row?JSON.parse(row.data):empty,revision:row?.revision??0,userId:user.userId});}
 catch(e){console.error('Read farm failed',e);return json({error:'Nie udało się odczytać danych. Spróbuj ponownie.'},503);}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sesja wygasła. Zaloguj się ponownie.'},401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Nieprawidłowe źródło żądania.'},403);
 try{
  const raw=await req.text();if(raw.length>12000)return json({error:'Wpis jest zbyt długi.'},413);
  const parsed=mutationSchema.safeParse(JSON.parse(raw));if(!parsed.success)return json({error:'Sprawdź pola formularza: datę, liczbę skrzynek i wartości liczbowe.'},400);
  const m=parsed.data;const db=farmDb();
  await db.prepare('INSERT INTO farms (owner,data,revision) VALUES (?,?,0) ON CONFLICT(owner) DO NOTHING').bind(user.userId,JSON.stringify(empty)).run();
  for(let attempt=0;attempt<5;attempt++){
   const row=await db.prepare('SELECT data,revision FROM farms WHERE owner=?').bind(user.userId).first<{data:string,revision:number}>();if(!row)throw new Error('Missing farm');
   const farm=JSON.parse(row.data) as Farm;
   if(farm.appliedIds.includes(m.requestId))return json({farm,revision:row.revision,userId:user.userId});
   let next:Farm;try{next=applyMutation(farm,m)}catch(e){return json({error:(e as Error).message},409)}
   const result=await db.prepare('UPDATE farms SET data=?,revision=revision+1 WHERE owner=? AND revision=?').bind(JSON.stringify(next),user.userId,row.revision).run();
   if(result.meta.changes===1)return json({farm:next,revision:row.revision+1,userId:user.userId});
  }
  return json({error:'Trwa inny zapis. Spróbuj ponownie.'},503);
 }catch(e){console.error('Save farm failed',e);return json({error:'Nie udało się zapisać. Wpis pozostaje w formularzu lub kolejce.'},503);}
}
