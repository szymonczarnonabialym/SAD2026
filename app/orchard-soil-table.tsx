'use client';
import {useState} from 'react';
import {Plus,Pencil,Trash2} from 'lucide-react';
import {plotFruit,type OrchardRecord,type Plot,type Kind} from '@/lib/orchard';
import {soilParameters,soilCategories,soilCategoryLabel,soilTests,previousSoilTest,type SoilTest} from '@/lib/soil';
import {soilNorm,nutrientOptimum,phLimingLimits,nowosielskiOptimum,normsSource,P2O5_PER_P,K2O_PER_K} from '@/lib/soil-norms';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const day=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric'});

function SoilChange({previous,current}:{previous:number|null|undefined,current:number}){
 if(previous==null)return null;
 const change=Math.round((current-previous)*100)/100;
 return <small className={change>0?'change positive':change<0?'change negative':'change'}>{change>0?'▲ +':change<0?'▼ ':''}{fmt(change)}</small>;
}

function NormBadge({test,parameter}:{test:SoilTest,parameter:string}){
 const value=test.values[parameter as keyof SoilTest['values']];
 const norm=value==null?null:soilNorm(parameter,value,test.soilCategory,test.depth);
 return norm&&<span className={'soil-norm '+norm.tone}>{norm.label}</span>;
}

const fmt1=(n:number)=>new Intl.NumberFormat('pl-PL',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n);
const fmt4=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:4}).format(n);
export function SoilNorms(){
 const range=(p:'p2o5'|'k2o'|'mg',c:typeof soilCategories[number]['value'])=>{const [low,high]=nutrientOptimum(p,c);return `${fmt1(low)}–${fmt1(high)}`};
 return <details className="panel soil-norms"><summary>Normy dla gleb sadowniczych</summary>
  <p className="progress-note">Ocena w tabeli dotyczy próbek z warstwy próchnicznej (głębokość od 0 cm, np. 0–20 cm). Do oceny pH, potasu i magnezu potrzebna jest kategoria agronomiczna gleby z protokołu.</p>
  <h3>Zakres optymalny fosforu, potasu i magnezu</h3>
  <div className="table-scroll"><table className="comparison-table"><thead><tr><th>Kategoria gleby</th><th>P₂O₅<span>mg/100 g</span></th><th>K₂O<span>mg/100 g</span></th><th>Mg<span>mg/100 g</span></th></tr></thead><tbody>{soilCategories.map(c=><tr key={c.value}><th scope="row">{c.label}</th><td>{range('p2o5',c.value)}</td><td>{range('k2o',c.value)}</td><td>{range('mg',c.value)}</td></tr>)}</tbody></table></div>
  <p className="progress-note">Poniżej zakresu — zasobność niska, powyżej — wysoka. Źródło: Instytut Ogrodnictwa–PIB (Wójcik, 2021), tabele 6, 8 i 10: fosfor i potas metodą Egnera-Riehma, magnez metodą Schachtschabela. Instytut podaje normy jako pierwiastki w mg/kg (P 40–80; K 50–80, 80–130 lub 130–210; Mg 30–50 lub 50–70 zależnie od udziału cząstek &lt; 0,02 mm). Tutaj są przeliczone na jednostki z protokołów stacji chemiczno-rolniczych: P₂O₅ = P × {fmt4(P2O5_PER_P)}, K₂O = K × {fmt4(K2O_PER_K)}, mg/100 g = mg/kg ÷ 10. Jeżeli protokół podaje wyniki metodą Mehlich 3, te normy nie mają zastosowania.</p>
  <h3>Odczyn pH (KCl) i potrzeby wapnowania</h3>
  <div className="table-scroll"><table className="comparison-table"><thead><tr><th>Kategoria gleby</th><th>Konieczne</th><th>Potrzebne</th><th>Wskazane</th><th>Ograniczone</th><th>Zbędne</th></tr></thead><tbody>{soilCategories.map(c=>{const [a,b,d,e]=phLimingLimits[c.value];return <tr key={c.value}><th scope="row">{c.label}</th><td>&lt; {fmt1(a)}</td><td>{fmt1(a)}–{fmt1(b)}</td><td>{fmt1(b+0.1)}–{fmt1(d)}</td><td>{fmt1(d+0.1)}–{fmt1(e)}</td><td>&gt; {fmt1(e)}</td></tr>})}</tbody></table></div>
  <p className="progress-note">Wg IUNG, za tabelą 1 Instytutu Ogrodnictwa. W sadzie wapno stosuje się w pasy wzdłuż rzędów, zwykle co 3–4 lata.</p>
  <h3>Wapń i mikroelementy — tylko orientacyjnie</h3>
  <div className="table-scroll"><table className="comparison-table"><thead><tr>{nowosielskiOptimum.map(n=><th key={n.label}>{n.label}</th>)}</tr></thead><tbody><tr>{nowosielskiOptimum.map(n=><td key={n.label}>{n.range}</td>)}</tr></tbody></table></div>
  <p className="progress-note">Zakresy optymalne w mg/dm³ dla warstwy próchnicznej gleby sadowniczej, oznaczane metodą Nowosielskiego (Instytut Ogrodnictwa, tabela 13). Wyniki w mg/kg z metod 1 M HCl lub Mehlich 3 nie są z nimi wprost porównywalne, dlatego aplikacja nie ocenia ich automatycznie. Normy IUNG dla mikroelementów (2020) dotyczą roślin polowych, nie sadów. Próchnica i N-min nie mają norm w tych źródłach.</p>
  <p className="progress-note"><a className="link-btn" href={normsSource} target="_blank" rel="noreferrer">Instytut Ogrodnictwa–PIB: Nawożenie roślin sadowniczych na podstawie analizy gleby (2021)</a></p>
 </details>;
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
   <div className="table-scroll"><table className="comparison-table soil-table"><caption className="sr-only">Wyniki kolejnych badań gleby</caption><thead><tr><th>Badanie</th>{measured.map(p=><th key={p.key}>{p.short}{p.unit&&<span>{p.unit}</span>}</th>)}<th><span className="sr-only">Akcje</span></th></tr></thead><tbody>{[...tests].reverse().map(t=>{const previous=previousSoilTest(tests,t);return <tr key={t.id}><th scope="row">{day(t.date)}<span>{place(t)}</span>{(t.soilCategory||t.lab)&&<span>{[t.soilCategory&&'Gleba '+soilCategoryLabel(t.soilCategory).toLowerCase(),t.lab].filter(Boolean).join(' · ')}</span>}{t.note&&<span className="note-text">{t.note}</span>}{pending.has(t.id)&&<span className="badge">Oczekuje</span>}</th>{measured.map(p=><td key={p.key}>{t.values[p.key]==null?'—':<>{fmt(t.values[p.key]!)}<br/><SoilChange previous={previous?.values[p.key]} current={t.values[p.key]!}/><NormBadge test={t} parameter={p.key}/></>}</td>)}<td><div className="record-actions"><button className="icon-btn" aria-label={`Edytuj badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onAdd('soil',t)}><Pencil/></button><button className="icon-btn" aria-label={`Usuń badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onDelete(t)}><Trash2/></button></div></td></tr>})}</tbody></table></div>
   <p className="progress-note">Tabela obejmuje wszystkie lata, niezależnie od wybranego sezonu. Strzałki pokazują zmianę względem poprzedniego badania tej samej kwatery i głębokości. Ocena pod wartością (np. „Optymalna”, „Wapnowanie wskazane”) pochodzi z norm dla gleb sadowniczych poniżej. Brak oceny oznacza głębszą próbkę, brak kategorii gleby lub parametr bez normy. Wykres zmian znajdziesz w Statystykach.</p>
  </>}</section>
  <SoilNorms/>
 </>;
}
