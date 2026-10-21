export async function readJson<T extends {error?:string}>(response:Response):Promise<T>{
 try{return await response.json() as T}
 catch{
  // Abort synchronization before committing state or removing the pending entry.
  throw new Error(response.ok?'Serwer zwrócił nieczytelną odpowiedź. Spróbuj ponownie.':`Serwer jest chwilowo niedostępny (HTTP ${response.status}). Spróbuj ponownie za chwilę.`);
 }
}
