'use client';
import {useState} from 'react';
import {compareSeasons,seasonStats,plotFruit,plotVarieties,weight,changeFrom,varieties,type OrchardRecord,type Plot,type Fruit} from '@/lib/orchard';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(n);
const fruitName=(fruit:Fruit)=>fruit==='sour'?'Wiśnie':'Czereśnie';
function Difference({previous,current}:{previous:number,current:number}){
 const change=changeFrom(previous,current);
 return <span className={change.kg>0?'change positive':change.kg<0?'change negative':'change'}>{change.kg>0?'+':''}{fmt(change.kg)} kg<br/><small>{change.percent==null?'Brak podstawy do %':`${change.percent>0?'+':''}${fmt(change.percent)}%`}</small></span>;
}

export default function OrchardStatistics({records,plots,year,years}:{records:OrchardRecord[],plots:Plot[],year:string,years:string[]}){
 const [baseline,setBaseline]=useState<string|null>(null),[plotId,setPlotId]=useState('all');
 const previousYear=baseline??years.find(y=>y!==year)??year;
 const comparison=compareSeasons(records,previousYear,year,plotId);
 const options=Array.from(new Set([...years,year,previousYear])).filter(y=>y!=='2025').sort().reverse();
 const selectedPlot=plots.find(p=>p.id===plotId);
 const shownFruits:Fruit[]=selectedPlot?[plotFruit(selectedPlot)]:['sour','sweet'];
 const rows=plots.filter(p=>plotId==='all'||p.id===plotId).map(p=>{
  const fruit=plotFruit(p),previous=seasonStats(records,previousYear,p.id)[fruit],current=seasonStats(records,year,p.id)[fruit];
  return {id:p.id,name:p.name,detail:`${fruitName(fruit)} · ${plotVarieties(p).join(', ')}`,previous:previous.kg,current:current.kg};
 });
 if(plotId==='all'||plotId==='none')for(const fruit of ['sour','sweet'] as const){
  const previous=seasonStats(records,previousYear,'none')[fruit],current=seasonStats(records,year,'none')[fruit];
  if(previous.entries||current.entries)rows.push({id:`none-${fruit}`,name:'Bez przypisanej kwatery',detail:fruitName(fruit),previous:previous.kg,current:current.kg});
 }
 const varietyRows=varieties.filter(v=>v!=='Łutówka'&&(!selectedPlot||plotVarieties(selectedPlot).includes(v))).map(v=>{
  const total=(season:string)=>records.reduce((s,r)=>s+(r.kind==='harvest'&&r.variety===v&&r.date.slice(0,4)===season&&(plotId==='all'||(plotId==='none'?r.plotId===null:r.plotId===plotId))?weight(r):0),0);
  return {name:v,previous:total(previousYear),current:total(year)};
 });
 return <>
  <div className="toolbar comparison-controls"><div><label htmlFor="comparison-year" className="field-label">Porównaj z sezonem</label><select id="comparison-year" value={previousYear} onChange={e=>setBaseline(e.target.value)}>{options.map(y=><option key={y} value={y}>{y}</option>)}</select></div><div><label htmlFor="comparison-plot" className="field-label">Kwatera</label><select id="comparison-plot" value={plotId} onChange={e=>setPlotId(e.target.value)}><option value="all">Wszystkie kwatery</option>{plots.map(p=><option value={p.id} key={p.id}>{p.name} · {fruitName(plotFruit(p))}</option>)}<option value="none">Bez przypisanej kwatery</option></select></div></div>
  {previousYear===year&&<p className="notice">Wybrano ten sam sezon po obu stronach. Wybierz wcześniejszy rok, aby zobaczyć zmianę.</p>}
  <div className="comparison-cards">{shownFruits.map(fruit=><section className={'panel comparison-card '+fruit} key={fruit}><h2>{fruitName(fruit)}</h2><div className="season-pair"><div><span>{previousYear}</span><strong>{fmt(comparison.previous[fruit].kg)} <small>kg</small></strong><span>{comparison.previous[fruit].entries} wpisów</span></div><div><span>{year}</span><strong>{fmt(comparison.current[fruit].kg)} <small>kg</small></strong><span>{comparison.current[fruit].entries} wpisów</span></div></div><Difference previous={comparison.previous[fruit].kg} current={comparison.current[fruit].kg}/></section>)}</div>
  <p className="progress-note">Kilogramy wiśni i czereśni liczymy osobno. Brak wpisów oznacza 0 zapisanych kg. Trwający sezon porównujesz z całym wybranym sezonem.</p>
  <section className="panel"><h2>Zbiory z poszczególnych kwater</h2>{rows.length?<div className="table-scroll"><table className="comparison-table"><thead><tr><th>Kwatera</th><th>{previousYear}</th><th>{year}</th><th>Zmiana</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row">{row.name}<span>{row.detail}</span></th><td>{fmt(row.previous)} kg</td><td>{fmt(row.current)} kg</td><td><Difference previous={row.previous} current={row.current}/></td></tr>)}</tbody></table></div>:<p className="muted">Dodaj kwatery i przypisz do nich zbiory, aby porównać wyniki.</p>}</section>
  {shownFruits.includes('sweet')&&<section className="panel"><h2>Czereśnie według odmiany</h2><div className="table-scroll"><table className="comparison-table"><thead><tr><th>Odmiana</th><th>{previousYear}</th><th>{year}</th><th>Zmiana</th></tr></thead><tbody>{varietyRows.map(row=><tr key={row.name}><th scope="row">{row.name}</th><td>{fmt(row.previous)} kg</td><td>{fmt(row.current)} kg</td><td><Difference previous={row.previous} current={row.current}/></td></tr>)}</tbody></table></div></section>}
  <section className="panel"><h2>{plotId==='all'?'Wspólny wynik finansowy':'Wynik finansowy dla wybranej kwatery'}</h2><div className="table-scroll"><table className="comparison-table"><thead><tr><th>Pozycja</th><th>{previousYear}</th><th>{year}</th></tr></thead><tbody><tr><th scope="row">Sprzedaż wiśni</th><td>{fmt(comparison.previous.sour.sales)} zł</td><td>{fmt(comparison.current.sour.sales)} zł</td></tr><tr><th scope="row">Sprzedaż czereśni</th><td>{fmt(comparison.previous.sweet.sales)} zł</td><td>{fmt(comparison.current.sweet.sales)} zł</td></tr><tr><th scope="row">Sprzedaż razem</th><td>{fmt(comparison.previous.sales)} zł</td><td>{fmt(comparison.current.sales)} zł</td></tr><tr><th scope="row">Zapisane koszty zabiegów</th><td>{fmt(comparison.previous.costs)} zł</td><td>{fmt(comparison.current.costs)} zł</td></tr><tr className="financial-result"><th scope="row">Wynik po zapisanych kosztach</th><td>{fmt(comparison.previous.result)} zł</td><td>{fmt(comparison.current.result)} zł</td></tr></tbody></table></div><p className="progress-note">Sprzedaż minus zapisane koszty zabiegów. Pełny zysk wymaga uwzględnienia wszystkich kosztów, np. zbioru i transportu. Koszty bez kwatery wchodzą do wyniku całego gospodarstwa.</p><p className="progress-note">Wpisy bez ceny sprzedaży: {previousYear} — {comparison.previous.missingPrices}; {year} — {comparison.current.missingPrices}. Ich kilogramy są w zbiorach, a sprzedaż pozostaje nieuzupełniona.</p></section>
 </>;
}
