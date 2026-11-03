'use client';
import {Wind,Snowflake,Sunrise,Sunset,Pencil,CheckCircle2,AlertTriangle,Clock} from 'lucide-react';
import {type OrchardRecord,type Kind,type Stock} from '@/lib/orchard';
import {treatmentTitle} from '@/lib/treatment-title';
import {describeWeather,sprayWindows,nightFrosts,sprayWindLimit,defaultRainfastHours,type Forecast} from '@/lib/weather';
import WeatherNow,{useForecast,sprayRainChecks,rainStatusText,WeatherIcon,fmt,weekday,clock} from './orchard-weather-now';
import OrchardWeather from './orchard-weather';

function SprayRainPanel({records,forecast,onEdit}:{records:OrchardRecord[],forecast:Forecast,onEdit:(kind:Kind,r:OrchardRecord)=>void}){
 const checks=sprayRainChecks(records,forecast),today=forecast.time.slice(0,10),stocks=records.filter((r):r is Stock=>r.kind==='stock');
 return <section className="panel"><h2>Deszcz po oprysku</h2>
  {!checks.length?<p className="muted">Brak oprysków z ostatnich dwóch dni. Po zapisaniu oprysku z godziną zobaczysz tu, czy środek zdążył się wchłonąć przed deszczem.</p>:checks.map(({spray,check,hours,unknown})=><div className="rain-check" key={spray.id}>
   <div className="rain-check-head">
    <div><strong>{treatmentTitle(spray,stocks)}</strong><span className="muted">{weekday(spray.date,today)}{spray.time?` ${spray.time}`:''} · wchłanianie {fmt(hours)} godz.{unknown.length>0&&` (domyślnie — uzupełnij odporność na zmywanie: ${unknown.join(', ')})`}</span></div>
    {check?<span className={'rain-badge '+check.status}>{check.status==='rain'||check.status==='risk'?<AlertTriangle size={15}/>:check.status==='absorbing'?<Clock size={15}/>:<CheckCircle2 size={15}/>}{rainStatusText[check.status]}</span>:<button type="button" className="button secondary" onClick={()=>onEdit('treatment',spray)}><Pencil size={15}/>Dodaj godzinę oprysku</button>}
   </div>
   {check&&check.hours.length>0&&<ol className="rain-hours" aria-label="Godziny wchłaniania">{check.hours.map(h=>{const past=h.time<=forecast.time,wet=h.precipitation>=0.1||(!past&&(h.rainChance??0)>=50);return <li key={h.time} className={(wet?'wet ':'')+(past?'past':'')}><span>{clock(h.time)}</span><strong>{fmt(h.precipitation)} mm</strong>{!past&&h.rainChance!=null&&<small>{h.rainChance}%</small>}{past&&<small>pomiar</small>}</li>})}</ol>}
   {check?.status==='rain'&&<p className="notice error">Deszcz zaczął padać o {clock(check.firstRain!.time)}, przed upływem {fmt(hours)} godz. od oprysku. Skuteczność mogła spaść — sprawdź na etykiecie, czy i kiedy zabieg powtórzyć.</p>}
   {check?.status==='risk'&&<p className="notice error">Prognoza zapowiada deszcz o {clock(check.firstRain!.time)}, zanim minie {fmt(hours)} godz. od oprysku.</p>}
  </div>)}
  <p className="progress-note">Czas wchłaniania to najdłuższa odporność na zmywanie spośród użytych środków (pole przy środku w Magazynie; bez wpisu {defaultRainfastHours} godz.). Godziny miniona — opad zmierzony, przyszłe — prognoza (ilość lub szansa ≥ 50%).</p>
 </section>;
}

function SprayWindowsPanel({forecast}:{forecast:Forecast}){
 const windows=sprayWindows(forecast.hours,forecast.time),today=forecast.time.slice(0,10);
 return <section className="panel"><h2>Okna do oprysku · 48 godz.</h2>
  {windows.length?<ul className="spray-windows">{windows.map(w=><li key={w.start}><Clock size={16}/><strong>{weekday(w.start.slice(0,10),today)} {clock(w.start)}–{clock(w.end)}</strong><span>{w.hours} godz. · wiatr do {fmt(w.maxWind)} m/s</span></li>)}</ul>:<p className="muted">W najbliższych 48 godzinach nie ma co najmniej 2-godzinnego okna bez deszczu i silnego wiatru.</p>}
  <p className="progress-note">Okno: wiatr do {sprayWindLimit} m/s, porywy do {sprayWindLimit*2} m/s, bez deszczu (także przez {defaultRainfastHours} godz. po zabiegu), temperatura 5–25 °C. Orientacyjnie — wymagania konkretnego środka są na etykiecie.</p>
 </section>;
}

function HourlyPanel({forecast}:{forecast:Forecast}){
 const hours=forecast.hours.filter(h=>h.time>=forecast.time.slice(0,13)+':00').slice(0,24),today=forecast.time.slice(0,10);
 return <section className="panel"><h2>Najbliższe 24 godziny</h2>
  <ol className="hourly">{hours.map(h=>{const hour=Number(h.time.slice(11,13)),wet=h.precipitation>=0.1||(h.rainChance??0)>=50,windy=h.wind>sprayWindLimit;return <li key={h.time} className={(wet?'wet ':'')+(windy?'windy':'')}>
   <span>{hour===0?weekday(h.time.slice(0,10),today):clock(h.time)}</span>
   <WeatherIcon code={h.code} isDay={hour>=6&&hour<20} aria-label={describeWeather(h.code).label}/>
   <strong>{fmt(h.temperature,0)}°</strong>
   <small className="h-rain">{h.precipitation>0?`${fmt(h.precipitation)} mm`:h.rainChance!=null?`${h.rainChance}%`:'—'}</small>
   <small className="h-wind"><Wind size={11}/>{fmt(h.wind)}</small>
  </li>})}</ol>
 </section>;
}

function DailyPanel({forecast}:{forecast:Forecast}){
 const today=forecast.time.slice(0,10);
 return <section className="panel"><h2>Prognoza na 7 dni</h2><div className="table-scroll"><table className="comparison-table daily-table"><thead><tr><th>Dzień</th><th>Pogoda</th><th>Temp.</th><th>Opady</th><th>Wiatr maks.</th><th>Słońce</th></tr></thead><tbody>{forecast.days.map(d=><tr key={d.date}>
  <th scope="row">{weekday(d.date,today)}<span>{new Date(d.date+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'})}</span></th>
  <td className="daily-sky"><WeatherIcon code={d.code}/>{describeWeather(d.code).label}</td>
  <td>{fmt(d.max,0)}° / <span className={d.min<=0?'frost-text':''}>{fmt(d.min,0)}°</span></td>
  <td>{fmt(d.rain)} mm{d.rainChance!=null&&<small> · {d.rainChance}%</small>}</td>
  <td className={d.wind>sprayWindLimit?'windy-text':''}>{fmt(d.wind)} m/s</td>
  <td className="sun-times">{d.sunrise&&<><Sunrise size={14}/>{clock(d.sunrise)}</>} {d.sunset&&<><Sunset size={14}/>{clock(d.sunset)}</>}</td>
 </tr>)}</tbody></table></div></section>;
}

function FrostPanel({forecast}:{forecast:Forecast}){
 const frosts=nightFrosts(forecast.hours,forecast.time),today=forecast.time.slice(0,10);
 return <section className="panel"><h2>Przymrozki w najbliższych nocach</h2>
  {frosts.length?<ul className="frost-list">{frosts.map(n=><li key={n.night} className={n.temperature<=-2?'severe':''}><Snowflake size={16}/><strong>{fmt(n.temperature)} °C</strong><span>noc {weekday(n.night,today).toLowerCase()}, najzimniej ok. {clock(n.time)}</span></li>)}</ul>:<p className="muted">Prognoza nie przewiduje spadku temperatury do 0 °C w najbliższych nocach.</p>}
  <p className="progress-note">Temperatura na wysokości 2 m; przy ziemi i w zagłębieniach terenu bywa o 1–3 °C niżej. W czasie kwitnienia już −1 °C może uszkodzić kwiaty.</p>
 </section>;
}

export default function OrchardWeatherTab({records,plotId,onEdit}:{records:OrchardRecord[],plotId:string,onEdit:(kind:Kind,r:OrchardRecord)=>void}){
 const state=useForecast();
 return <>
  <WeatherNow records={records}/>
  {state?.forecast&&<>
   <div className="weather-grid"><SprayRainPanel records={records} forecast={state.forecast} onEdit={onEdit}/><SprayWindowsPanel forecast={state.forecast}/></div>
   <HourlyPanel forecast={state.forecast}/>
   <FrostPanel forecast={state.forecast}/>
   <DailyPanel forecast={state.forecast}/>
  </>}
  <OrchardWeather records={records} plotId={plotId}/>
 </>;
}
