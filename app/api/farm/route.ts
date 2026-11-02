import { getChatGPTUser } from '@/app/chatgpt-auth';
import { farmDb } from '@/db/farm';
import { readFarm, saveMutation, FarmConflictError, type FarmDb } from '@/db/farm-store';
import {mutationSchema} from '@/lib/orchard';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const db=()=>farmDb() as unknown as FarmDb;
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Zaloguj się, aby otworzyć rejestr.'},401);
 try{const {farm,revision}=await readFarm(db(),user.userId);return json({farm,revision,userId:user.userId});}
 catch(e){console.error('Read farm failed',e);return json({error:'Nie udało się odczytać danych. Spróbuj ponownie.'},503);}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sesja wygasła. Zaloguj się ponownie.'},401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Nieprawidłowe źródło żądania.'},403);
 try{
  const raw=await req.text();if(raw.length>12000)return json({error:'Wpis jest zbyt długi.'},413);
  const parsed=mutationSchema.safeParse(JSON.parse(raw));if(!parsed.success)return json({error:'Sprawdź pola formularza: datę, liczbę skrzynek i wartości liczbowe.'},400);
  const {farm,revision}=await saveMutation(db(),user.userId,parsed.data);
  return json({farm,revision,userId:user.userId});
 }catch(e){
  if(e instanceof FarmConflictError)return json({error:e.message},409);
  if(e instanceof Error&&e.message==='Trwa inny zapis. Spróbuj ponownie.')return json({error:e.message},503);
  console.error('Save farm failed',e);return json({error:'Nie udało się zapisać. Wpis pozostaje w formularzu lub kolejce.'},503);
 }
}
