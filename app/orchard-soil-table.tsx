'use client';
import {useState} from 'react';
import {Plus,Pencil,Trash2} from 'lucide-react';
import {plotFruit,type OrchardRecord,type Plot,type Kind} from '@/lib/orchard';
import {soilParameters,soilCategoryLabel,soilTests,previousSoilTest,type SoilTest} from '@/lib/soil';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const day=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric'});

function SoilChange({previous,current}:{previous:number|null|undefined,current:number}){
 if(previous==null)return null;
 const change=Math.round((current-previous)*100)/100;
 return <small className={change>0?'change positive':change<0?'change negative':'change'}>{change>0?'▲ +':change<0?'▼ ':''}{fmt(change)}</small>;
}

export function SoilTable({records,plots,disabled,pending,onAdd,onDelete}:{records:OrchardRecord[],plots:Plot[],disabled:boolean,pending:Set<string>,onAdd:(kind:Kind,r?:OrchardRecord)=>void,onDelete:(r:OrchardRecord)=>void}){
 const [plotId,setPlotId]=useState('all');
 const tests=soilTests(records,plotId);
 const plotName=(id:string|null)=>plots.find(p=>p.id===id)?.name||'Cały sad / bez kwatery';
 const measured=soilParameters.filter(p=>tests.some(t=>t.values[p.key]!=null));
 const place=(t:SoilTest)=>[plotName(t.plotId),t.depth].filter(Boolean).join(' · ');
 return <>
  <div className="toolbar"><h2>Badania gleby</h2><button className="button" disabled={disabled} onClick={()=>onAdd('soil')}><Plus size={18}/>Dodaj badanie gleby</button></div>
  <div className="toolbar comparison-controls"><div><label htmlFor="soil-plot-filter" className="field-label">Kwatera</label><select id="soil-plot-filter" value={plotId} onChange={e=>setPlotId(e.target.value)}><option value="all">Wszystkie kwatery</option>{plots.map(p=><option value={p.id} key={p.id}>{p.name} · {plotFruit(p)==='sour'?'Wiśnie':'Czereśnie'}</option>)}<option value="none">Cały sad / bez kwatery</option></select></div></div>
  <section className="panel">{!tests.length?<p className="muted">{plotId==='all'?'Nie zapisano jeszcze badań gleby. Przepisz wyniki z protokołu laboratorium — każde kolejne badanie pokaże zmianę względem poprzedniego.':'Brak badań gleby dla wybranej kwatery.'}</p>:<>
   <div className="table-scroll"><table className="comparison-table soil-table"><caption className="sr-only">Wyniki kolejnych badań gleby</caption><thead><tr><th>Badanie</th>{measured.map(p=><th key={p.key}>{p.short}{p.unit&&<span>{p.unit}</span>}</th>)}<th><span className="sr-only">Akcje</span></th></tr></thead><tbody>{[...tests].reverse().map(t=>{const previous=previousSoilTest(tests,t);return <tr key={t.id}><th scope="row">{day(t.date)}<span>{place(t)}</span>{(t.soilCategory||t.lab)&&<span>{[t.soilCategory&&'Gleba '+soilCategoryLabel(t.soilCategory).toLowerCase(),t.lab].filter(Boolean).join(' · ')}</span>}{t.note&&<span className="note-text">{t.note}</span>}{pending.has(t.id)&&<span className="badge">Oczekuje</span>}</th>{measured.map(p=><td key={p.key}>{t.values[p.key]==null?'—':<>{fmt(t.values[p.key]!)}<br/><SoilChange previous={previous?.values[p.key]} current={t.values[p.key]!}/></>}</td>)}<td><div className="record-actions"><button className="icon-btn" aria-label={`Edytuj badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onAdd('soil',t)}><Pencil/></button><button className="icon-btn" aria-label={`Usuń badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onDelete(t)}><Trash2/></button></div></td></tr>})}</tbody></table></div>
   <p className="progress-note">Tabela obejmuje wszystkie lata, niezależnie od wybranego sezonu. Strzałki pokazują zmianę względem poprzedniego badania tej samej kwatery i głębokości. Ocenę zasobności (niska, średnia, wysoka) odczytuj z protokołu laboratorium — zależy od kategorii gleby i metody analizy. Wykres zmian znajdziesz w Statystykach.</p>
  </>}</section>
 </>;
}
