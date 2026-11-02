'use client';
import {useRef,useState,type FormEvent} from 'react';
import {today,plotFruit,type OrchardRecord,type Plot} from '@/lib/orchard';
import {parseDecimalInput} from '@/lib/decimal-input';
import {soilParameters,soilCategories,soilDepths,hasSoilValues,type SoilTest,type SoilValues} from '@/lib/soil';

export function SoilForm({record,plots,onSave,busy,setBusy,error,setError}:{record?:OrchardRecord,plots:Plot[],onSave:(r:OrchardRecord)=>Promise<void>,busy:boolean,setBusy:(b:boolean)=>void,error:string,setError:(s:string)=>void}){
 const r=record?.kind==='soil'?record:undefined,id=useRef(r?.id||crypto.randomUUID());
 const [plotId,setPlotId]=useState(r?.plotId||'none'),[category,setCategory]=useState(r?.soilCategory||'none');
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(soilParameters.map(p=>[p.key,r?.values[p.key]!=null?String(r.values[p.key]).replace('.',','):''])));
 const invalid=soilParameters.filter(p=>values[p.key].trim()!==''&&(!Number.isFinite(parseDecimalInput(values[p.key]))||parseDecimalInput(values[p.key])>p.max));
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');
  if(invalid.length){setError('Popraw wartości: '+invalid.map(p=>p.label).join(', ')+'.');return}
  const parsed=Object.fromEntries(soilParameters.map(p=>[p.key,values[p.key].trim()===''?null:parseDecimalInput(values[p.key])])) as SoilValues;
  if(!hasSoilValues(parsed)){setError('Wpisz co najmniej jeden wynik badania gleby.');return}
  setBusy(true);const f=new FormData(e.currentTarget),s=(k:string)=>String(f.get(k)||'');
  try{await onSave({id:id.current,kind:'soil',version:r?.version??0,date:s('date'),note:s('note'),plotId:plotId==='none'?null:plotId,depth:s('depth'),lab:s('lab'),soilCategory:category==='none'?null:category as SoilTest['soilCategory'],values:parsed})}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 const field=(p:typeof soilParameters[number])=><div key={p.key}><label htmlFor={'soil-'+p.key}>{p.label}{p.unit&&` (${p.unit})`}</label><input id={'soil-'+p.key} type="text" inputMode="decimal" maxLength={24} value={values[p.key]} onChange={e=>setValues(v=>({...v,[p.key]:e.target.value}))} placeholder="Nie badano" aria-invalid={invalid.includes(p)}/></div>;
 return <form className="fields" onSubmit={submit}>
  <div className="form-row"><div><label htmlFor="soil-date">Data pobrania próbki</label><input id="soil-date" name="date" type="date" required defaultValue={r?.date||today()}/></div><div><label htmlFor="soil-plot">Kwatera</label><select id="soil-plot" value={plotId} onChange={e=>setPlotId(e.target.value)}><option value="none">Cały sad / bez kwatery</option>{plots.map(p=><option key={p.id} value={p.id}>{p.name} · {plotFruit(p)==='sour'?'Wiśnie':'Czereśnie'}</option>)}</select></div></div>
  <div className="form-row"><div><label htmlFor="soil-depth">Głębokość próbki</label><input id="soil-depth" name="depth" list="soil-depths" maxLength={40} defaultValue={r?.depth??'0–20 cm'} placeholder="np. 0–20 cm"/><datalist id="soil-depths">{soilDepths.map(d=><option key={d} value={d}/>)}</datalist></div><div><label htmlFor="soil-category">Kategoria agronomiczna gleby (do oceny wg norm)</label><select id="soil-category" value={category} onChange={e=>setCategory(e.target.value)}><option value="none">Nie podano</option>{soilCategories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div></div>
  <div><label htmlFor="soil-lab">Laboratorium / nr protokołu</label><input id="soil-lab" name="lab" maxLength={160} defaultValue={r?.lab} placeholder="Opcjonalnie, np. OSChR Poznań, nr 123/2026"/></div>
  <fieldset className="soil-values"><legend>Wyniki podstawowe</legend>{soilParameters.filter(p=>p.main).map(field)}</fieldset>
  <details className="soil-values-more" open={soilParameters.some(p=>!p.main&&values[p.key]!=='')}><summary>Azot, wapń i mikroelementy</summary><div className="soil-values">{soilParameters.filter(p=>!p.main).map(field)}</div></details>
  <p className="progress-note">Wpisz liczby z protokołu (przecinek lub kropka). Puste pola oznaczają, że parametru nie badano. Jednostki jak w nawiasach — wyniki w innych jednostkach przelicz przed zapisaniem.</p>
  <div><label htmlFor="soil-note">Uwagi / zalecenia laboratorium</label><textarea id="soil-note" name="note" maxLength={2000} defaultValue={r?.note} placeholder="Opcjonalnie, np. zalecane wapnowanie 2 t/ha"/></div>
  {error&&<p className="notice error" role="alert">{error}</p>}<button className="button" type="submit" disabled={busy}>{busy?'Zapisywanie…':'Zapisz badanie gleby'}</button>
 </form>;
}
