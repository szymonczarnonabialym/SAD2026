'use client';
import {useMemo,useState} from 'react';
import {Plus,Pencil,Trash2} from 'lucide-react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {type OrchardRecord,type Plot,type Kind} from '@/lib/orchard';
import {soilParameters,soilCategoryLabel,soilParameter,soilTests,previousSoilTest,soilTimeline,type SoilParameter,type SoilTest} from '@/lib/soil';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const colors=['#176145','#b92e54','#4268a7','#9a5b12','#7750a4','#087c85','#bd4830','#657320'];
const unitText=(key:SoilParameter)=>soilParameter(key).unit;
const day=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric'});

function SoilChange({previous,current}:{previous:number|null|undefined,current:number}){
 if(previous==null)return null;
 const change=Math.round((current-previous)*100)/100;
 return <small className={change>0?'change positive':change<0?'change negative':'change'}>{change>0?'▲ +':change<0?'▼ ':''}{fmt(change)}</small>;
}

export default function OrchardSoil({records,plots,plotId,disabled,pending,onAdd,onDelete}:{records:OrchardRecord[],plots:Plot[],plotId:string,disabled:boolean,pending:Set<string>,onAdd:(kind:Kind,r?:OrchardRecord)=>void,onDelete:(r:OrchardRecord)=>void}){
 const tests=useMemo(()=>soilTests(records,plotId),[records,plotId]);
 const plotName=(id:string|null)=>plots.find(p=>p.id===id)?.name||'Cały sad / bez kwatery';
 const place=(t:SoilTest)=>[plotName(t.plotId),t.depth].filter(Boolean).join(' · ');
 const measured=soilParameters.filter(p=>tests.some(t=>t.values[p.key]!=null));
 const [chosen,setChosen]=useState<SoilParameter>('ph');
 const parameter=measured.some(p=>p.key===chosen)?chosen:measured[0]?.key??'ph';
 const timeline=soilTimeline(records,parameter,plotId,place);
 const series=timeline.series.map((s,i)=>({...s,color:colors[i%colors.length]}));
 const unit=unitText(parameter);
 return <>
  <section className="panel"><div className="toolbar"><div><h2>Badania gleby</h2><span className="muted">Wyniki analiz z kolejnych lat w jednym miejscu. Zakres kwatery wybierasz powyżej.</span></div><button className="button" disabled={disabled} onClick={()=>onAdd('soil')}><Plus size={18}/>Dodaj badanie gleby</button></div>
  {!tests.length?<p className="muted">{plotId==='all'?'Nie zapisano jeszcze badań gleby. Przepisz wyniki z protokołu laboratorium — każde kolejne badanie pokaże zmianę względem poprzedniego.':'Brak badań gleby dla wybranej kwatery.'}</p>:<>
   <div className="comparison-controls toolbar"><div><label htmlFor="soil-parameter" className="field-label">Parametr na wykresie</label><select id="soil-parameter" value={parameter} onChange={e=>setChosen(e.target.value as SoilParameter)}>{measured.map(p=><option key={p.key} value={p.key}>{p.label}{p.unit?` (${p.unit})`:''}</option>)}</select></div></div>
   <div className="chart-legend">{series.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.name}</span>)}</div>
   <div className="harvest-line-chart" role="group" aria-label={`${soilParameter(parameter).label} rok do roku`}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{width:320,height:300}}>
     <LineChart data={timeline.data} margin={{top:16,right:18,bottom:12,left:0}} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="year" type="number" domain={['dataMin','dataMax']} ticks={timeline.data.map(r=>r.year!)} allowDecimals={false} tickFormatter={v=>String(v)} padding={{left:14,right:14}} minTickGap={22}/>
      <YAxis width={70} domain={parameter==='ph'?[(min:number)=>Math.max(0,Math.floor(min-0.5)),(max:number)=>Math.min(14,Math.ceil(max+0.5))]:[0,'auto']} tickFormatter={v=>fmt(v)}/>
      <Tooltip trigger="click" labelFormatter={v=>`Rok ${v}`} formatter={(value,name)=>[`${fmt(Number(value))}${unit?' '+unit:''}`,name]} contentStyle={{borderRadius:10,fontSize:14,maxWidth:220,overflowWrap:'anywhere',whiteSpace:'normal'}}/>
      {series.map(s=><Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} type="linear" dot={{r:4}} activeDot={{r:6}} connectNulls isAnimationActive={false}/>)}
     </LineChart>
    </ResponsiveContainer>
   </div>
   <p className="progress-note">Oś pozioma: rok badania · oś pionowa: {soilParameter(parameter).label}{unit?` w ${unit}`:''}. Każda linia to jedna kwatera i głębokość pobrania próbki. Kilka badań z jednego roku jest uśrednianych. Dotknij wykresu, aby zobaczyć wartości.</p>
   {timeline.data.length===1&&<p className="progress-note">Badania pochodzą z jednego roku, więc widać punkty. Kolejne badania utworzą linie zmian.</p>}
  </>}
  </section>
  {tests.length>0&&<section className="panel"><h2>Wyniki kolejnych badań</h2><div className="table-scroll"><table className="comparison-table soil-table"><thead><tr><th>Badanie</th>{measured.map(p=><th key={p.key}>{p.short}{p.unit&&<span>{p.unit}</span>}</th>)}<th><span className="sr-only">Akcje</span></th></tr></thead><tbody>{[...tests].reverse().map(t=>{const previous=previousSoilTest(tests,t);return <tr key={t.id}><th scope="row">{day(t.date)}<span>{place(t)}</span>{(t.soilCategory||t.lab)&&<span>{[t.soilCategory&&'Gleba '+soilCategoryLabel(t.soilCategory).toLowerCase(),t.lab].filter(Boolean).join(' · ')}</span>}{t.note&&<span className="note-text">{t.note}</span>}{pending.has(t.id)&&<span className="badge">Oczekuje</span>}</th>{measured.map(p=><td key={p.key}>{t.values[p.key]==null?'—':<>{fmt(t.values[p.key]!)}<br/><SoilChange previous={previous?.values[p.key]} current={t.values[p.key]!}/></>}</td>)}<td><div className="record-actions"><button className="icon-btn" aria-label={`Edytuj badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onAdd('soil',t)}><Pencil/></button><button className="icon-btn" aria-label={`Usuń badanie gleby ${t.date}`} disabled={disabled||pending.has(t.id)} onClick={()=>onDelete(t)}><Trash2/></button></div></td></tr>})}</tbody></table></div><p className="progress-note">Strzałki pokazują zmianę względem poprzedniego badania tej samej kwatery i głębokości. Ocenę zasobności (niska, średnia, wysoka) odczytuj z protokołu laboratorium — zależy od kategorii gleby i metody analizy.</p></section>}
 </>;
}
