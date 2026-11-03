'use client';
import {useEffect,useState} from 'react';
import {Sun,Moon,Cloud,CloudSun,CloudMoon,CloudRain,CloudDrizzle,CloudSnow,CloudLightning,CloudFog,Wind,Droplets,Thermometer,Snowflake,type LucideProps} from 'lucide-react';
import {orchardLocation,forecastUrl,parseForecast,describeWeather,sprayConditions,frostDays,weatherSource,type Forecast,type WeatherKind} from '@/lib/weather';

const fmt=(n:number,digits=1)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:digits}).format(n);
const weekday=(date:string,i:number)=>i===0?'Dziś':i===1?'Jutro':new Date(date+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'});
function WeatherIcon({code,isDay=true,...props}:{code:number,isDay?:boolean}&LucideProps){
 const kind:WeatherKind=describeWeather(code).kind;
 switch(kind){
  case 'clear':return isDay?<Sun {...props}/>:<Moon {...props}/>;
  case 'partly':return isDay?<CloudSun {...props}/>:<CloudMoon {...props}/>;
  case 'fog':return <CloudFog {...props}/>;
  case 'drizzle':return <CloudDrizzle {...props}/>;
  case 'rain':return <CloudRain {...props}/>;
  case 'snow':return <CloudSnow {...props}/>;
  case 'storm':return <CloudLightning {...props}/>;
  default:return <Cloud {...props}/>;
 }
}
const cacheKey='moj-sad-forecast-v1';
// The forecast changes slowly; one request per half hour per device is plenty.
async function loadForecast():Promise<Forecast>{
 try{const hit=JSON.parse(localStorage.getItem(cacheKey)||'null') as {at:number,data:Forecast}|null;if(hit&&Date.now()-hit.at<30*60000)return hit.data}catch{/* Storage is optional. */}
 const response=await fetch(forecastUrl());
 if(!response.ok)throw new Error('Serwis pogodowy jest niedostępny.');
 const data=parseForecast(await response.json());
 try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),data}))}catch{/* Storage is optional. */}
 return data;
}

export default function WeatherNow(){
 const [state,setState]=useState<{forecast?:Forecast,error?:string}|null>(null);
 useEffect(()=>{let active=true;
  loadForecast().then(forecast=>{if(active)setState({forecast})},()=>{if(active)setState({error:navigator.onLine?'Nie udało się pobrać pogody.':'Brak internetu — pogoda pojawi się po połączeniu.'})});
  return()=>{active=false};
 },[]);
 if(!state)return <section className="panel weather-now weather-loading" aria-busy="true"><p className="muted">Pobieranie pogody…</p></section>;
 if(!state.forecast)return <section className="panel weather-now weather-loading"><p className="muted">{state.error}</p></section>;
 const f=state.forecast,now=describeWeather(f.code),spray=sprayConditions(f),frost=frostDays(f);
 return <section className={`panel weather-now weather-${now.kind}${f.isDay?'':' weather-night'}`} aria-label="Pogoda w sadzie">
  <div className="weather-top">
   <div className="weather-main">
    <WeatherIcon code={f.code} isDay={f.isDay} className="weather-icon" aria-hidden="true" strokeWidth={1.6}/>
    <div>
     <strong className="weather-temp">{fmt(f.temperature,0)}°</strong>
     <span className="weather-label">{now.label}</span>
     <span className="weather-place">{orchardLocation.name} · odczuwalna {fmt(f.feelsLike,0)}°</span>
    </div>
   </div>
   <dl className="weather-facts">
    <div><Wind aria-hidden="true"/><dt>Wiatr</dt><dd>{fmt(f.wind)} m/s<small>porywy {fmt(f.gusts)}</small></dd></div>
    <div><Droplets aria-hidden="true"/><dt>Opady</dt><dd>{fmt(f.precipitation)} mm<small>dziś {fmt(f.days[0]?.rain??0)} mm</small></dd></div>
    <div><Thermometer aria-hidden="true"/><dt>Wilgotność</dt><dd>{fmt(f.humidity,0)}%</dd></div>
   </dl>
  </div>
  <div className="weather-notes">
   <p className={'weather-chip '+(spray.ok?'ok':'bad')}><Droplets aria-hidden="true"/><span>Oprysk teraz: <strong>{spray.ok?'warunki sprzyjające':'niezalecany'}</strong> · {spray.reason}</span></p>
   {frost.length>0&&<p className="weather-chip frost"><Snowflake aria-hidden="true"/><span>Przymrozek: {frost.map(d=>`${weekday(d.date,f.days.indexOf(d)).toLowerCase()} ${fmt(d.min)}°`).join(', ')}</span></p>}
  </div>
  <ul className="weather-days">{f.days.map((d,i)=>{return <li key={d.date}><span>{weekday(d.date,i)}</span><WeatherIcon code={d.code} aria-label={describeWeather(d.code).label}/><strong>{fmt(d.max,0)}°</strong><small>{fmt(d.min,0)}°</small>{d.rainChance!=null&&d.rainChance>=20&&<small className="rain-chance">{d.rainChance}%</small>}</li>})}</ul>
  <p className="weather-source">Prognoza dla okolic sadu, <a href={weatherSource} target="_blank" rel="noreferrer">Open-Meteo</a>. Ocena oprysku jest orientacyjna (wiatr do 4 m/s, bez deszczu) — wiążąca jest etykieta środka.</p>
 </section>;
}
