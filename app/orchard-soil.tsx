'use client';
import {useMemo,useState} from 'react';
import {CartesianGrid,Line,LineChart,ReferenceArea,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {type OrchardRecord,type Plot} from '@/lib/orchard';
import {soilParameters,soilCategories,soilParameter,soilTests,soilTimeline,type SoilParameter,type SoilTest} from '@/lib/soil';
import {isTopsoil,isNormParameter,nutrientOptimum,phLimingLimits} from '@/lib/soil-norms';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const colors=['#176145','#b92e54','#4268a7','#9a5b12','#7750a4','#087c85','#bd4830','#657320'];

export default function OrchardSoil({records,plots,plotId,onOpenTable}:{records:OrchardRecord[],plots:Plot[],plotId:string,onOpenTable:()=>void}){
 const tests=useMemo(()=>soilTests(records,plotId),[records,plotId]);
 const plotName=(id:string|null)=>plots.find(p=>p.id===id)?.name||'Cały sad / bez kwatery';
 const place=(t:SoilTest)=>[plotName(t.plotId),t.depth].filter(Boolean).join(' · ');
 const measured=soilParameters.filter(p=>tests.some(t=>t.values[p.key]!=null));
 const [chosen,setChosen]=useState<SoilParameter>('ph');
 const parameter=measured.some(p=>p.key===chosen)?chosen:measured[0]?.key??'ph';
 const timeline=soilTimeline(records,parameter,plotId,place);
 const series=timeline.series.map((s,i)=>({...s,color:colors[i%colors.length]}));
 const unit=soilParameter(parameter).unit;
 // A reference is drawn only when every topsoil test in view shares one soil category (phosphorus does not depend on it).
 const topsoil=tests.filter(t=>t.values[parameter]!=null&&isTopsoil(t.depth));
 const categories=Array.from(new Set(topsoil.map(t=>t.soilCategory??null))),category=categories.length===1?categories[0]:null;
 const band=isNormParameter(parameter)&&topsoil.length&&(parameter==='p2o5'||category)?nutrientOptimum(parameter,category??'medium'):null;
 const phLimit=parameter==='ph'&&category?phLimingLimits[category][3]:null;
 return <section className="panel"><div className="toolbar"><div><h2>Stan gleby rok do roku</h2><span className="muted">Wykres z badań zapisanych w zakładce Zabiegi. Zakres kwatery wybierasz powyżej.</span></div><button type="button" className="button secondary" onClick={onOpenTable}>Tabela i wpisywanie badań</button></div>
  {!tests.length?<p className="muted">{plotId==='all'?'Nie zapisano jeszcze badań gleby. Dodasz je w zakładce Zabiegi → Badania gleby.':'Brak badań gleby dla wybranej kwatery.'}</p>:<>
   <div className="comparison-controls toolbar"><div><label htmlFor="soil-parameter" className="field-label">Parametr na wykresie</label><select id="soil-parameter" value={parameter} onChange={e=>setChosen(e.target.value as SoilParameter)}>{measured.map(p=><option key={p.key} value={p.key}>{p.label}{p.unit?` (${p.unit})`:''}</option>)}</select></div></div>
   <div className="chart-legend">{series.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.name}</span>)}</div>
   <div className="harvest-line-chart" role="group" aria-label={`${soilParameter(parameter).label} rok do roku`}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{width:320,height:300}}>
     <LineChart data={timeline.data} margin={{top:16,right:18,bottom:12,left:0}} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="year" type="number" domain={['dataMin','dataMax']} ticks={timeline.data.map(r=>r.year!)} allowDecimals={false} tickFormatter={v=>String(v)} padding={{left:14,right:14}} minTickGap={22}/>
      <YAxis width={70} domain={parameter==='ph'?[(min:number)=>Math.max(0,Math.floor(min-0.5)),(max:number)=>Math.min(14,Math.ceil(max+0.5))]:[0,'auto']} tickFormatter={v=>fmt(v)}/>
      <Tooltip trigger="click" labelFormatter={v=>`Rok ${v}`} formatter={(value,name)=>[`${fmt(Number(value))}${unit?' '+unit:''}`,name]} contentStyle={{borderRadius:10,fontSize:14,maxWidth:220,overflowWrap:'anywhere',whiteSpace:'normal'}}/>
      {band&&<ReferenceArea y1={band[0]} y2={band[1]} fill="#176145" fillOpacity={0.1} stroke="none" ifOverflow="extendDomain"/>}
      {phLimit!=null&&<ReferenceLine y={phLimit} stroke="#9a5b12" strokeDasharray="5 4" ifOverflow="extendDomain"/>}
      {series.map(s=><Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} type="linear" dot={{r:4}} activeDot={{r:6}} connectNulls isAnimationActive={false}/>)}
     </LineChart>
    </ResponsiveContainer>
   </div>
   <p className="progress-note">Oś pozioma: rok badania · oś pionowa: {soilParameter(parameter).label}{unit?` w ${unit}`:''}. Każda linia to jedna kwatera i głębokość pobrania próbki. Kilka badań z jednego roku jest uśrednianych. Dotknij wykresu, aby zobaczyć wartości.</p>
   {band&&<p className="progress-note"><i className="soil-band-key"/>Zielony pas: zakres optymalny dla gleb sadowniczych ({fmt(band[0])}–{fmt(band[1])} {unit}{parameter==='p2o5'?'':', gleba '+soilCategories.find(c=>c.value===category)?.label.toLowerCase()}), warstwa próchniczna. Normy znajdziesz pod tabelą badań w Zabiegach.</p>}
   {phLimit!=null&&<p className="progress-note"><i className="soil-line-key"/>Przerywana linia: pH {fmt(phLimit)} — powyżej wapnowanie zbędne (gleba {soilCategories.find(c=>c.value===category)?.label.toLowerCase()}, wg IUNG).</p>}
   {isNormParameter(parameter)||parameter==='ph'?!band&&phLimit==null&&<p className="progress-note">Normy nie są rysowane, bo badania mają różne lub niepodane kategorie gleby albo pochodzą z głębszej warstwy. Wybierz jedną kwaterę i uzupełnij kategorię gleby.</p>:null}
   {timeline.data.length===1&&<p className="progress-note">Badania pochodzą z jednego roku, więc widać punkty. Kolejne badania utworzą linie zmian.</p>}
  </>}
 </section>;
}
