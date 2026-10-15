'use client';
import {useEffect,useState} from 'react';
import './orchard-site-offer.css';
import {availabilityLabels,initialOffer,siteOfferSchema,type SiteOffer,type OfferSnapshot} from '@/lib/site-offer';

export default function OrchardSiteOffer({enabled}:{enabled:boolean}){
  const [snapshot,setSnapshot]=useState<OfferSnapshot|null>(null),[draft,setDraft]=useState<SiteOffer>(initialOffer);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[dirty,setDirty]=useState(false);
  async function load(){
    setBusy(true);setError('');setNotice('');
    try{const r=await fetch('/api/site-offer',{cache:'no-store'});if(r.status===404)throw new Error('Zarządzanie stroną jest dostępne we wdrożeniu na własnym Cloudflare.');const data=await r.json() as OfferSnapshot & {error?:string};if(!r.ok)throw new Error(data.error||'Nie udało się wczytać oferty.');setSnapshot(data);setDraft(data.offer);setDirty(false)}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  useEffect(()=>{if(enabled)void load()},[enabled]);
  useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[dirty]);
  function change(next:SiteOffer){setDraft(next);setDirty(true);setNotice('')}
  function itemChange(index:number,patch:Partial<SiteOffer['items'][number]>){change({...draft,items:draft.items.map((item,i)=>i===index?{...item,...patch}:item)})}
  async function publish(){
    if(!snapshot)return;setError('');setNotice('');const checked=siteOfferSchema.safeParse(draft);
    if(!checked.success){setError(checked.error.issues[0]?.message||'Sprawdź pola oferty.');return}
    setBusy(true);
    try{const r=await fetch('/api/site-offer',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({offer:checked.data,revision:snapshot.revision})});const data=await r.json() as OfferSnapshot & {error?:string};if(!r.ok)throw new Error(data.error||'Nie udało się opublikować.');setSnapshot(data);setDraft(data.offer);setDirty(false);setNotice('Oferta opublikowana. Klienci zobaczą zmiany po odświeżeniu strony.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <section className="panel site-offer"><div className="toolbar"><div><h2>Oferta na stronie</h2><p className="muted">Ustal ceny i dostępność dla klientów. Cena ofertowa jest niezależna od cen zapisanych przy zbiorach.</p></div><a className="button secondary" href="https://czeresniekoscian.pl/#oferta" target="_blank" rel="noreferrer">Otwórz stronę ↗</a></div>
    {!enabled&&<p className="notice">Zaloguj się i poczekaj na wczytanie gospodarstwa.</p>}
    {error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
    {snapshot&&<form className="fields" onSubmit={e=>{e.preventDefault();void publish()}}><fieldset disabled={busy||!enabled} className="offer-fields"><div><label htmlFor="offer-message">Komunikat dla klientów</label><textarea id="offer-message" maxLength={500} placeholder="Np. Dziś odbiór do godziny 18:00." value={draft.message} onChange={e=>change({...draft,message:e.target.value})}/></div>
      <div className="offer-items">{draft.items.map((item,index)=><article className="offer-item" key={item.id}><div className="form-row"><div><label htmlFor={`name-${item.id}`}>Odmiana</label><input id={`name-${item.id}`} value={item.name} maxLength={80} required onChange={e=>itemChange(index,{name:e.target.value})}/></div><div><label htmlFor={`fruit-${item.id}`}>Gatunek</label><select id={`fruit-${item.id}`} value={item.fruit} onChange={e=>itemChange(index,{fruit:e.target.value as 'sweet'|'sour'})}><option value="sweet">Czereśnie</option><option value="sour">Wiśnie</option></select></div></div><div className="form-row"><div><label htmlFor={`price-${item.id}`}>Cena zł/kg</label><input id={`price-${item.id}`} type="number" inputMode="decimal" min="0.01" step="0.01" max="10000" value={item.pricePerKg??''} required={item.status==='available'} onChange={e=>itemChange(index,{pricePerKg:e.target.value===''?null:Number(e.target.value)})}/></div><div><label htmlFor={`status-${item.id}`}>Dostępność</label><select id={`status-${item.id}`} value={item.status} onChange={e=>itemChange(index,{status:e.target.value as typeof item.status})}>{Object.entries(availabilityLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></div><label className="offer-visible"><input type="checkbox" checked={item.visible} onChange={e=>itemChange(index,{visible:e.target.checked})}/>Pokaż tę odmianę na stronie</label></article>)}</div>
      <button className="button secondary" type="button" disabled={draft.items.length>=40} onClick={()=>change({...draft,items:[...draft.items,{id:crypto.randomUUID(),fruit:'sweet',name:'',pricePerKg:null,status:'soon',visible:true}]})}>+ Dodaj odmianę</button></fieldset>
      <div className="toolbar"><p className="muted">{dirty?'Masz nieopublikowane zmiany.':snapshot.updatedAt?`Ostatnia publikacja: ${new Date(snapshot.updatedAt).toLocaleString('pl-PL')}`:'Oferta nie była jeszcze publikowana.'}</p><button className="button" disabled={busy||!enabled} type="submit">{busy?'Zapisywanie…':'Opublikuj na stronie'}</button></div>
    </form>}
    {!snapshot&&enabled&&busy&&<p role="status">Wczytywanie oferty…</p>}
    {enabled&&<details className="offer-reload"><summary>Wczytaj ponownie</summary><p className="muted">Wczytanie aktualnej wersji odrzuci zmiany w tym formularzu.</p><button className="button secondary" disabled={busy} onClick={()=>void load()}>Wczytaj aktualną ofertę</button></details>}
  </section>
}
