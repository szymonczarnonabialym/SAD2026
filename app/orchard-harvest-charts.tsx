'use client';
import {useMemo,useState} from 'react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {harvestTimeline} from '@/lib/harvest-timeline';
import {type OrchardRecord,type Fruit} from '@/lib/orchard';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const colors=['#176145','#b92e54','#4268a7','#9a5b12','#7750a4','#087c85','#bd4830','#657320'];
type Series={key:string,name:string,color:string};
function HarvestLineChart({data,series,title}:{data:Record<string,number|null>[],series:Series[],title:string}){
 const hasData=data.some(row=>series.some(s=>row[s.key]!=null));
 return <>
  {!series.length?<p className="notice">Wybierz przynajmniej jedną odmianę.</p>:!hasData?<p className="notice">Brak zapisanych zbiorów dla tego wyboru.</p>:<>
   <div className="harvest-line-chart" role="group" aria-label={title}>
    <ResponsiveContainer width="100%" height="100%" initialDimension={{width:320,height:300}}>
     <LineChart data={data} margin={{top:16,right:18,bottom:12,left:0}} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="year" type="number" domain={['dataMin','dataMax']} ticks={data.map(r=>r.year!)} allowDecimals={false} tickFormatter={v=>String(v)} padding={{left:14,right:14}} minTickGap={22}/>
      <YAxis width={64} domain={[0,'auto']} tickFormatter={v=>new Intl.NumberFormat('pl-PL',{notation:'compact',maximumFractionDigits:1}).format(v)}/>
      <Tooltip trigger="click" labelFormatter={v=>`Sezon ${v}`} formatter={(value,name)=>[`${fmt(Number(value))} kg`,name]} contentStyle={{borderRadius:10,fontSize:14,maxWidth:220,overflowWrap:'anywhere',whiteSpace:'normal'}}/>
      {series.map((s,i)=><Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} strokeDasharray={i>7?'6 3':undefined} type="linear" dot={{r:4}} activeDot={{r:6}} connectNulls={false} isAnimationActive={false}/>)}
     </LineChart>
    </ResponsiveContainer>
   </div>
   <p className="progress-note">Oś pozioma: rok · oś pionowa: kg. Dotknij wykresu, aby zobaczyć dokładne wartości.</p>
   {data.filter(row=>series.some(s=>row[s.key]!=null)).length===1&&<p className="progress-note">Zapisano zbiory tylko w jednym sezonie, więc widać punkty. Kolejne sezony utworzą linie porównania.</p>}
  </>}
  {series.length>0&&<details className="chart-data"><summary>Dane wykresu w tabeli</summary><div className="table-scroll"><table className="comparison-table"><caption className="sr-only">{title}</caption><thead><tr><th>Sezon</th>{series.map(s=><th key={s.key}>{s.name} (kg)</th>)}</tr></thead><tbody>{data.map(row=><tr key={row.year}><th scope="row">{row.year}</th>{series.map(s=><td key={s.key}>{row[s.key]==null?'Brak danych':fmt(row[s.key]!)}</td>)}</tr>)}</tbody></table></div></details>}
 </>;
}
export default function OrchardHarvestCharts({records,plotId,currentYear,fruits}:{records:OrchardRecord[],plotId:string,currentYear:string,fruits:Fruit[]}){
 const timeline=useMemo(()=>harvestTimeline(records,currentYear,plotId),[records,currentYear,plotId]);
 const [hidden,setHidden]=useState<string[]>([]);
 const varieties=timeline.names.map((name,i)=>({key:'v'+i,name,color:colors[i%colors.length]}));
 const fruitSeries=fruits.map(fruit=>({key:fruit,name:fruit==='sour'?'Wiśnie':'Czereśnie',color:fruit==='sour'?'#4268a7':'#b92e54'}));
 return <>
  <p className="notice">Wykresy obejmują wszystkie sezony zapisanych zbiorów oraz bieżący rok, z uwzględnieniem wybranej kwatery. Brak wpisów oznacza przerwę w linii, nie zerowy plon. Trwający sezon może być niepełny.</p>
  <section className="panel"><h2>Zbiory rok do roku</h2><div className="chart-legend">{fruitSeries.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.name}</span>)}</div><p className="progress-note">Wiśnie i czereśnie mają osobne linie — ich kilogramy nie są sumowane.</p><HarvestLineChart data={timeline.data} series={fruitSeries} title="Zbiory wiśni i czereśni rok do roku"/></section>
  {fruits.includes('sweet')&&<section className="panel"><h2>Odmiany czereśni rok do roku</h2>{varieties.length?<>
   <div className="button-group"><button type="button" className="link-btn" onClick={()=>setHidden([])}>Pokaż wszystkie odmiany</button><button type="button" className="link-btn" onClick={()=>setHidden(timeline.names)}>Ukryj wszystkie odmiany</button></div>
   <fieldset className="chart-varieties"><legend>Odmiany na wykresie</legend>{varieties.map(s=><label key={s.name}><input type="checkbox" checked={!hidden.includes(s.name)} onChange={e=>setHidden(previous=>e.target.checked?previous.filter(n=>n!==s.name):[...previous,s.name])}/><i style={{background:s.color}}/>{s.name}</label>)}</fieldset>
   <HarvestLineChart data={timeline.data} series={varieties.filter(s=>!hidden.includes(s.name))} title="Zbiory poszczególnych odmian czereśni rok do roku"/>
  </>:<p className="muted">Dodaj odmiany do kwatery czereśni lub zapisz pierwszy zbiór, aby zobaczyć wykres odmian.</p>}</section>}
 </>;
}
