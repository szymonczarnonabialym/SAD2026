'use client';
import {useEffect,useState} from 'react';
import {Sun,Moon,Cloud,CloudSun,CloudMoon,CloudRain,CloudDrizzle,CloudSnow,CloudLightning,CloudFog,Wind,Droplets,Thermometer,Snowflake,ChevronRight,type LucideProps} from 'lucide-react';
import {type OrchardRecord,type Stock} from '@/lib/orchard';
import {recentSprays,treatmentRainfast} from '@/lib/spray-records';
import {orchardLocation,forecastUrl,parseForecast,describeWeather,sprayConditions,nightFrosts,rainAfterSpray,defaultRainfastHours,weatherSource,type Forecast,type WeatherKind,type RainCheck} from '@/lib/weather';

export const fmt=(n:number,digits=1)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:digits}).format(n);
export const weekday=(date:string,today:string)=>{const diff=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);return diff===0?'Dziś':diff===1?'Jutro':diff===-1?'Wczoraj':new Date(date+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'})};
export const clock=(iso:string)=>iso.slice(11,16);
export function WeatherIcon({code,isDay=true,...props}:{code:number,isDay?:boolean}&LucideProps){
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

const cacheKey='moj-sad-forecast-v2';
// The forecast changes slowly; one request per 20 minutes per device is plenty.
async function loadForecast():Promise<Forecast>{
 try{const hit=JSON.parse(localStorage.getItem(cacheKey)||'null') as {at:number,data:Forecast}|null;if(hit&&Date.now()-hit.at<20*60000)return hit.data}catch{/* Storage is optional. */}
 const response=await fetch(forecastUrl());
 if(!response.ok)throw new Error('Serwis pogodowy jest niedostępny.');
 const data=parseForecast(await response.json());
 try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),data}))}catch{/* Storage is optional. */}
 return data;
}
export function useForecast(){
 const [state,setState]=useState<{forecast?:Forecast,error?:string}|null>(null);
 useEffect(()=>{let active=true;
  loadForecast().then(forecast=>{if(active)setState({forecast})},()=>{if(active)setState({error:navigator.onLine?'Nie udało się pobrać pogody.':'Brak internetu — pogoda pojawi się po połączeniu.'})});
  return()=>{active=false};
 },[]);
 return state;
}

export type SprayRain={spray:Extract<OrchardRecord,{kind:'treatment'}>,check:RainCheck|null,hours:number,unknown:string[]};
/** Sprays of the last two days with the rain check against measured and forecast hourly precipitation. */
export function sprayRainChecks(records:OrchardRecord[],forecast:Forecast):SprayRain[]{
 const now=forecast.time,from=new Date(Date.parse(now.slice(0,10)+'T12:00:00Z')-2*86400000).toISOString().slice(0,10);
 const stocks=records.filter((r):r is Stock=>r.kind==='stock');
 return recentSprays(records,from).map(spray=>{const r=treatmentRainfast(spray,stocks,defaultRainfastHours);return {spray,hours:r.hours,unknown:r.unknown,check:spray.time?rainAfterSpray(spray.date,spray.time,r.hours,forecast.hours,now):null}});
}
export const rainStatusText:Record<RainCheck['status'],string>={rain:'Deszcz spadł przed wchłonięciem',risk:'Ryzyko deszczu przed wchłonięciem',absorbing:'Środek się wchłania — bez deszczu w prognozie',ok:'Wchłonięty bez deszczu','no-data':'Brak danych pogodowych dla tej godziny'};

export default function WeatherNow({records,onOpen}:{records:OrchardRecord[],onOpen?:()=>void}){
 const state=useForecast();
 if(!state)return <section className="panel weather-now weather-loading" aria-busy="true"><p className="muted">Pobieranie pogody…</p></section>;
 if(!state.forecast)return <section className="panel weather-now weather-loading"><p className="muted">{state.error}</p></section>;
 const f=state.forecast,today=f.time.slice(0,10),now=describeWeather(f.code),spray=sprayConditions(f),frost=nightFrosts(f.hours,f.time);
 const alerts=sprayRainChecks(records,f).filter(x=>x.check&&(x.check.status==='rain'||x.check.status==='risk'||x.check.status==='absorbing'));
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
   {alerts.map(a=><p key={a.spray.id} className={'weather-chip '+(a.check!.status==='absorbing'?'ok':'bad')}><CloudRain aria-hidden="true"/><span>Oprysk {weekday(a.spray.date,today).toLowerCase()} {a.spray.time}: <strong>{rainStatusText[a.check!.status]}</strong>{a.check!.firstRain&&` · ${clock(a.check!.firstRain.time)}`}</span></p>)}
   <p className={'weather-chip '+(spray.ok?'ok':'bad')}><Droplets aria-hidden="true"/><span>Oprysk teraz: <strong>{spray.ok?'warunki sprzyjające':'niezalecany'}</strong> · {spray.reason}</span></p>
   {frost.length>0&&<p className="weather-chip frost"><Snowflake aria-hidden="true"/><span>Przymrozek: {frost.map(n=>`noc ${weekday(n.night,today).toLowerCase()} ${fmt(n.temperature)}°`).join(', ')}</span></p>}
  </div>
  <ul className="weather-days">{f.days.slice(0,5).map(d=><li key={d.date}><span>{weekday(d.date,today)}</span><WeatherIcon code={d.code} aria-label={describeWeather(d.code).label}/><strong>{fmt(d.max,0)}°</strong><small>{fmt(d.min,0)}°</small>{d.rainChance!=null&&d.rainChance>=20&&<small className="rain-chance">{d.rainChance}%</small>}</li>)}</ul>
  <div className="weather-foot"><p className="weather-source">Prognoza dla okolic sadu, <a href={weatherSource} target="_blank" rel="noreferrer">Open-Meteo</a>.</p>{onOpen&&<button type="button" className="link-btn weather-more" onClick={onOpen}>Wszystko o pogodzie<ChevronRight size={15}/></button>}</div>
 </section>;
}
