import { z } from 'zod';

export const availabilityLabels = {available:'Dostępne',soon:'Wkrótce',sold_out:'Wyprzedane',season_over:'Sezon zakończony'} as const;
export const siteOfferSchema = z.object({
  siteEnabled:z.boolean().default(true),
  season:z.number().int().min(2020).max(2100).default(2026),
  message:z.string().trim().max(500),
  items:z.array(z.object({
    id:z.string().regex(/^[a-z0-9-]{1,64}$/),
    fruit:z.enum(['sweet','sour']),
    name:z.string().trim().min(1).max(80),
    pricePerKg:z.number().finite().positive().max(10000).multipleOf(0.01).nullable(),
    status:z.enum(['available','soon','sold_out','season_over']),
    visible:z.boolean(),
  }).strict()).max(40),
}).strict().superRefine((data,ctx)=>{
  if(new Set(data.items.map(i=>i.id)).size!==data.items.length)ctx.addIssue({code:'custom',message:'Odmiany muszą mieć różne identyfikatory.'});
  data.items.forEach((item,index)=>{if(data.siteEnabled&&item.status==='available'&&item.pricePerKg===null)ctx.addIssue({code:'custom',path:['items',index,'pricePerKg'],message:'Podaj cenę dostępnej odmiany.'})});
});
export type SiteOffer = z.infer<typeof siteOfferSchema>;
export type OfferSnapshot = {offer:SiteOffer;revision:number;updatedAt:string|null};
export const initialOffer:SiteOffer={siteEnabled:true,season:2026,message:'',items:[
  {id:'lutowka',fruit:'sour',name:'Łutówka',pricePerKg:10,status:'season_over',visible:true},
  ...['Vanda','Vega','Burlat','Kordia','Techlovan','Ulster','Regina'].map(name=>({id:name.toLowerCase(),fruit:'sweet' as const,name,pricePerKg:null,status:'season_over' as const,visible:true})),
]};

// This table contains only the intentionally published shop offer, never farm records.
async function ensureTable(db:D1Database){await db.prepare('CREATE TABLE IF NOT EXISTS site_offer (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)').run()}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function readOffer(db:D1Database):Promise<OfferSnapshot>{
  await ensureTable(db);
  const row=await db.prepare("SELECT data,revision,updated_at FROM site_offer WHERE id='main'").first<{data:string;revision:number;updated_at:string}>();
  return row?{offer:siteOfferSchema.parse(JSON.parse(row.data)),revision:row.revision,updatedAt:row.updated_at}:{offer:initialOffer,revision:0,updatedAt:null};
}
export async function publicOffer(request:Request,db?:D1Database):Promise<Response>{
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  if(!db)return json({error:'Oferta jest chwilowo niedostępna.'},503);
  const snapshot=await readOffer(db);
  if(!snapshot.updatedAt)return json({error:'Oferta nie została jeszcze opublikowana.'},503);
  // Explicit projection prevents hidden varieties and any future private fields leaking.
  const {siteEnabled,season}=snapshot.offer;
  const response=json({siteEnabled,season,message:siteEnabled?snapshot.offer.message:'',updatedAt:snapshot.updatedAt,items:siteEnabled?snapshot.offer.items.filter(i=>i.visible).map(({id,fruit,name,pricePerKg,status})=>({id,fruit,name,pricePerKg,status})):[]});
  return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
}
export async function manageOffer(request:Request,db:D1Database):Promise<Response>{
  if(request.method==='GET')return json(await readOffer(db));
  if(request.method!=='PUT')return new Response(null,{status:405,headers:{Allow:'GET, PUT'}});
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Nieprawidłowe źródło żądania.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Wymagany jest JSON.'},415);
  const body=await request.text();if(body.length>20000)return json({error:'Oferta jest zbyt długa.'},413);
  let raw:unknown;try{raw=JSON.parse(body)}catch{return json({error:'Nieprawidłowe dane.'},400)}
  const parsed=z.object({offer:siteOfferSchema,revision:z.number().int().nonnegative()}).strict().safeParse(raw);
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message??'Sprawdź pola oferty.'},400);
  const {offer,revision}=parsed.data,updatedAt=new Date().toISOString();
  await ensureTable(db);
  const result=revision===0
    ?await db.prepare("INSERT INTO site_offer (id,data,revision,updated_at) VALUES ('main',?,1,?) ON CONFLICT(id) DO NOTHING").bind(JSON.stringify(offer),updatedAt).run()
    :await db.prepare("UPDATE site_offer SET data=?,revision=revision+1,updated_at=? WHERE id='main' AND revision=?").bind(JSON.stringify(offer),updatedAt,revision).run();
  if(result.meta.changes!==1)return json({error:'Oferta została zmieniona w innej karcie. Wczytaj aktualną wersję przed ponownym zapisem.'},409);
  return json({offer,revision:revision+1,updatedAt});
}
