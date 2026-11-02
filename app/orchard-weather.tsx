'use client';
import {useEffect,useState} from 'react';
import {seasonStats,today,type OrchardRecord} from '@/lib/orchard';
import {orchardLocation,weatherSource,floweringWindow,seasonRange,weatherUrl,parseDaily,summarizeSeason,type SeasonWeather} from '@/lib/weather';
import {readJson} from '@/lib/read-response-json';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(n);
const fmtKg=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0}).format(n);
const day=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
const cacheKey=(year:number)=>`moj-sad-weather-v1-${orchardLocation.latitude}-${orchardLocation.longitude}-${year}`;
// Finished seasons never change, so they are kept on the device; the running season is refreshed every 12 hours.
function cached(year:number){try{const v=JSON.parse(localStorage.getItem(cacheKey(year))||'null') as {at:number,data:SeasonWeather}|null;return v&&(v.data.complete||Date.now()-v.at<12*3600000)?v.data:null}catch{return null}}
async function loadSeason(year:number):Promise<SeasonWeather>{
 const hit=cached(year);if(hit)return hit;
 const now=today(),response=await fetch(weatherUrl(year,now));
 const json=await readJson<{error?:string}>(response);
 if(!response.ok)throw new Error('Serwis pogodowy jest niedostępny. Spróbuj później.');
 const data=summarizeSeason(year,parseDaily(json),seasonRange(year,now).complete);
 try{localStorage.setItem(cacheKey(year),JSON.stringify({at:Date.now(),data}))}catch{/* Storage is optional. */}
 return data;
}

export default function OrchardWeather({records,plotId}:{records:OrchardRecord[],plotId:string}){
 const thisYear=Number(today().slice(0,4));
 const years=Array.from(new Set([thisYear,...records.filter(r=>r.kind==='harvest').map(r=>Number(r.date.slice(0,4)))])).filter(y=>y!==2025&&y>=1950&&y<=thisYear).sort((a,b)=>b-a);
 const key=years.join(',');
 // Results are tagged with the year list they belong to, so a changed list shows as loading without resetting state in the effect.
 const [loaded,setLoaded]=useState<{key:string,seasons:Record<number,SeasonWeather>,error:string}|null>(null);
 const loading=loaded?.key!==key,seasons=loaded?.seasons??{},error=loading?'':loaded!.error;
 useEffect(()=>{let active=true;
  Promise.allSettled(key.split(',').map(y=>loadSeason(Number(y)))).then(results=>{if(!active)return;
   const next:Record<number,SeasonWeather>={};results.forEach(r=>{if(r.status==='fulfilled')next[r.value.year]=r.value});
   setLoaded({key,seasons:next,error:results.some(r=>r.status==='rejected')?(navigator.onLine?'Nie udało się pobrać części danych pogodowych. Spróbuj ponownie później.':'Brak internetu — dane pogodowe pobiorą się po połączeniu.'):''})});
  return()=>{active=false};
 },[key]);
 return <section className="panel weather"><h2>Pogoda w sezonie</h2>
  <p className="muted">Dane pobierane automatycznie dla okolic sadu ({orchardLocation.name}). Przymrozki liczone w przybliżonym okresie kwitnienia {floweringWindow.from.split('-').reverse().join('.')}–{floweringWindow.to.split('-').reverse().join('.')}, deszcz i upał w czasie zbiorów (czerwiec–lipiec).</p>
  {loading&&<p className="notice">Pobieranie danych pogodowych…</p>}
  {error&&<p className="notice error" role="alert">{error}</p>}
  {!loading&&<div className="table-scroll"><table className="comparison-table weather-table"><thead><tr><th>Sezon</th><th>Przymrozki w kwitnieniu<span>dni ≤ 0 °C</span></th><th>W tym silne<span>dni ≤ −2 °C</span></th><th>Najniższa temp.<span>kwiecień–maj</span></th><th>Opady VI–VII<span>mm</span></th><th>Deszcz w zbiorach<span>dni ≥ 5 mm</span></th><th>Upał<span>dni ≥ 30 °C</span></th><th>Zbiór wiśni</th><th>Zbiór czereśni</th></tr></thead><tbody>{years.map(y=>{const w=seasons[y],harvest=seasonStats(records,String(y),plotId);return <tr key={y}><th scope="row">{y}{w&&!w.complete&&<span>dane do {day(seasonRange(y,today()).end)}</span>}</th>{w?<>
   <td className={w.frostDays?'weather-alert':''}>{w.frostDays}{w.frosts.length>0&&<small>{w.frosts.map(f=>`${day(f.date)} ${fmt(f.min)} °C`).join(', ')}</small>}</td>
   <td className={w.severeFrostDays?'weather-alert':''}>{w.severeFrostDays}</td>
   <td>{w.lowest?<>{fmt(w.lowest.min)} °C<small>{day(w.lowest.date)}</small></>:'—'}</td>
   <td>{fmt(w.harvestRain)}</td><td>{w.rainyHarvestDays}</td><td>{w.hotDays}</td></>:<td colSpan={6}>{loading?'…':'Brak danych'}</td>}
   <td>{harvest.sour.entries?fmtKg(harvest.sour.kg)+' kg':'—'}</td><td>{harvest.sweet.entries?fmtKg(harvest.sweet.kg)+' kg':'—'}</td></tr>})}</tbody></table></div>}
  <p className="progress-note">Przymrozek w czasie kwitnienia może zniszczyć kwiaty i zawiązki, a deszcz tuż przed zbiorem powoduje pękanie czereśni. Zestawienie z plonem pomaga wyjaśnić słabsze lata. Temperatury to wartości dobowe na wysokości 2 m z modelu dla siatki ok. 10 km — przy ziemi i w zagłębieniach terenu bywa chłodniej. Zbiory uwzględniają wybraną kwaterę. Źródło: <a className="link-btn" href={weatherSource} target="_blank" rel="noreferrer">Open-Meteo, archiwum pogody</a>.</p>
 </section>;
}
