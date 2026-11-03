// Seasonal weather for the orchard from the Open-Meteo historical archive (ERA5 reanalysis, roughly 10 km grid).
// No API key is needed; values describe the area around the orchard, not a station in the orchard itself.
export const orchardLocation={name:'Wyskoć Mała k. Kościana',latitude:52.0503,longitude:16.7834};
export const weatherSource='https://open-meteo.com/en/docs/historical-weather-api';
// Approximate cherry flowering window in Wielkopolska; frosts outside it rarely damage the crop.
export const floweringWindow={from:'04-01',to:'05-20'};
export type DailyWeather={date:string,min:number|null,max:number|null,rain:number|null};
export type SeasonWeather={year:number,frostDays:number,severeFrostDays:number,frosts:{date:string,min:number}[],lowest:{date:string,min:number}|null,harvestRain:number,rainyHarvestDays:number,hotDays:number,complete:boolean};

const shift=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
/** Archive data lags a few days behind, so the current season ends at the last available day. */
export function seasonRange(year:number,today:string){
 const start=`${year}-03-01`,end=`${year}-07-31`,available=shift(today,-6);
 return {start,end:available<end?available:end,complete:available>=end};
}
export function weatherUrl(year:number,today:string){
 const {start,end}=seasonRange(year,today);
 const q=new URLSearchParams({latitude:String(orchardLocation.latitude),longitude:String(orchardLocation.longitude),start_date:start,end_date:end,daily:'temperature_2m_min,temperature_2m_max,precipitation_sum',timezone:'Europe/Warsaw'});
 return 'https://archive-api.open-meteo.com/v1/archive?'+q.toString();
}
export function parseDaily(json:unknown):DailyWeather[]{
 const daily=(json as {daily?:{time?:string[],temperature_2m_min?:(number|null)[],temperature_2m_max?:(number|null)[],precipitation_sum?:(number|null)[]}})?.daily;
 if(!daily?.time)throw new Error('Nieprawidłowa odpowiedź serwisu pogodowego.');
 return daily.time.map((date,i)=>({date,min:daily.temperature_2m_min?.[i]??null,max:daily.temperature_2m_max?.[i]??null,rain:daily.precipitation_sum?.[i]??null}));
}
/** Frosts during flowering and rain/heat during the June–July harvest, the main weather risks for cherries. */
export function summarizeSeason(year:number,days:DailyWeather[],complete:boolean):SeasonWeather{
 const md=(d:DailyWeather)=>d.date.slice(5);
 const flowering=days.filter(d=>md(d)>=floweringWindow.from&&md(d)<=floweringWindow.to&&d.min!=null);
 const frosts=flowering.filter(d=>d.min!<=0).map(d=>({date:d.date,min:d.min!}));
 const spring=days.filter(d=>md(d)>='04-01'&&md(d)<='05-31'&&d.min!=null);
 const lowest=spring.reduce<{date:string,min:number}|null>((low,d)=>!low||d.min!<low.min?{date:d.date,min:d.min!}:low,null);
 const harvest=days.filter(d=>md(d)>='06-01'&&md(d)<='07-31');
 return {year,frostDays:frosts.length,severeFrostDays:frosts.filter(f=>f.min<=-2).length,frosts,lowest,
  harvestRain:Math.round(harvest.reduce((n,d)=>n+(d.rain??0),0)*10)/10,
  rainyHarvestDays:harvest.filter(d=>(d.rain??0)>=5).length,
  hotDays:harvest.filter(d=>(d.max??-99)>=30).length,complete};
}

// ---------- Current weather and short forecast (Open-Meteo forecast API) ----------
export type WeatherKind='clear'|'partly'|'cloudy'|'fog'|'drizzle'|'rain'|'snow'|'storm';
/** WMO weather codes as used by Open-Meteo, grouped into the icons shown in the app. */
export function describeWeather(code:number):{label:string,kind:WeatherKind}{
 if(code===0)return {label:'Bezchmurnie',kind:'clear'};
 if(code===1)return {label:'Przeważnie słonecznie',kind:'partly'};
 if(code===2)return {label:'Częściowe zachmurzenie',kind:'partly'};
 if(code===3)return {label:'Pochmurno',kind:'cloudy'};
 if(code===45||code===48)return {label:'Mgła',kind:'fog'};
 if(code>=51&&code<=57)return {label:code>=56?'Marznąca mżawka':'Mżawka',kind:'drizzle'};
 if(code>=61&&code<=67)return {label:code>=66?'Marznący deszcz':code===65?'Silny deszcz':code===61?'Słaby deszcz':'Deszcz',kind:'rain'};
 if(code>=71&&code<=77)return {label:'Śnieg',kind:'snow'};
 if(code>=80&&code<=82)return {label:code===82?'Ulewa':'Przelotny deszcz',kind:'rain'};
 if(code===85||code===86)return {label:'Przelotny śnieg',kind:'snow'};
 if(code>=95)return {label:code>=96?'Burza z gradem':'Burza',kind:'storm'};
 return {label:'Brak opisu',kind:'cloudy'};
}
export function forecastUrl(){
 const q=new URLSearchParams({latitude:String(orchardLocation.latitude),longitude:String(orchardLocation.longitude),
  current:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
  hourly:'temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m',
  daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
  wind_speed_unit:'ms',timezone:'Europe/Warsaw',past_days:'2',forecast_days:'7'});
 return 'https://api.open-meteo.com/v1/forecast?'+q.toString();
}
export type HourWeather={time:string,temperature:number,precipitation:number,rainChance:number|null,code:number,wind:number,gusts:number,humidity:number};
export type DayWeather={date:string,code:number,max:number,min:number,rain:number,rainChance:number|null,wind:number,sunrise:string|null,sunset:string|null};
export type Forecast={time:string,temperature:number,feelsLike:number,humidity:number,precipitation:number,code:number,wind:number,gusts:number,isDay:boolean,days:DayWeather[],hours:HourWeather[]};
export function parseForecast(json:unknown):Forecast{
 const j=json as {current?:Record<string,number|string>,daily?:Record<string,(number|string|null)[]>,hourly?:Record<string,(number|string|null)[]>};
 const c=j?.current,d=j?.daily,h=j?.hourly;
 if(!c||!d?.time)throw new Error('Nieprawidłowa odpowiedź serwisu pogodowego.');
 const n=(v:unknown)=>typeof v==='number'?v:Number(v),opt=(v:unknown)=>v==null?null:n(v);
 const today=String(c.time).slice(0,10);
 // Past days are requested for the rain check after recent sprays; daily cards start today.
 const days=d.time.map((date,i)=>({date:String(date),code:n(d.weather_code?.[i]),max:n(d.temperature_2m_max?.[i]),min:n(d.temperature_2m_min?.[i]),rain:n(d.precipitation_sum?.[i]??0),rainChance:opt(d.precipitation_probability_max?.[i]),wind:n(d.wind_speed_10m_max?.[i]),sunrise:d.sunrise?.[i]==null?null:String(d.sunrise[i]),sunset:d.sunset?.[i]==null?null:String(d.sunset[i])})).filter(day=>day.date>=today);
 const hours=(h?.time??[]).map((time,i)=>({time:String(time),temperature:n(h!.temperature_2m?.[i]),precipitation:n(h!.precipitation?.[i]??0),rainChance:opt(h!.precipitation_probability?.[i]),code:n(h!.weather_code?.[i]),wind:n(h!.wind_speed_10m?.[i]),gusts:n(h!.wind_gusts_10m?.[i]),humidity:n(h!.relative_humidity_2m?.[i])}));
 return {time:String(c.time),temperature:n(c.temperature_2m),feelsLike:n(c.apparent_temperature),humidity:n(c.relative_humidity_2m),precipitation:n(c.precipitation),code:n(c.weather_code),wind:n(c.wind_speed_10m),gusts:n(c.wind_gusts_10m),isDay:n(c.is_day)===1,days,hours};
}
// Spraying is generally done at wind speeds up to 4 m/s and not right before rain; this is guidance, the label decides.
export const sprayWindLimit=4;
export function sprayConditions(f:Forecast):{ok:boolean,reason:string}{
 const today=f.days[0],kind=describeWeather(f.code).kind;
 if(kind==='rain'||kind==='drizzle'||kind==='storm'||f.precipitation>0)return {ok:false,reason:'pada deszcz'};
 if(f.wind>sprayWindLimit)return {ok:false,reason:`wiatr ${f.wind.toFixed(1).replace('.',',')} m/s (powyżej ${sprayWindLimit} m/s)`};
 if(f.gusts>sprayWindLimit*2)return {ok:false,reason:`porywy do ${f.gusts.toFixed(1).replace('.',',')} m/s`};
 if(today&&today.rainChance!=null&&today.rainChance>=60)return {ok:false,reason:`szansa deszczu ${today.rainChance}% dziś`};
 return {ok:true,reason:`wiatr ${f.wind.toFixed(1).replace('.',',')} m/s, bez opadów`};
}
/** Days in the forecast with a minimum at or below 0 °C. */
export const frostDays=(f:Forecast)=>f.days.filter(d=>d.min<=0);

// ---------- Rain after spraying and spray windows ----------
/** Used when the label's rainfastness is not entered for a product. */
export const defaultRainfastHours=2;
const RAIN_MM=0.1,RAIN_RISK=50;
const hourStart=(date:string,time:string)=>`${date}T${time.slice(0,2)}:00`;
const addHours=(iso:string,h:number)=>{const d=new Date(iso+':00Z');d.setUTCHours(d.getUTCHours()+h);return d.toISOString().slice(0,16)};
export type RainCheck={status:'rain'|'risk'|'absorbing'|'ok'|'no-data',until:string,hours:HourWeather[],firstRain:HourWeather|null};
/**
 * Rain between the spray and the end of the rainfastness period. Hours before `now` use measured precipitation,
 * later hours the forecast (amount or a chance of at least 50%). Times are local, as returned by Open-Meteo.
 */
export function rainAfterSpray(date:string,time:string,rainfastHours:number,hours:HourWeather[],now:string):RainCheck{
 const start=hourStart(date,time),until=addHours(`${date}T${time}`,rainfastHours);
 const window=hours.filter(h=>h.time>=start&&h.time<until);
 if(!window.length)return {status:'no-data',until,hours:[],firstRain:null};
 const past=window.filter(h=>h.time<=now),future=window.filter(h=>h.time>now);
 const fell=past.find(h=>h.precipitation>=RAIN_MM)??null;
 if(fell)return {status:'rain',until,hours:window,firstRain:fell};
 const risk=future.find(h=>h.precipitation>=RAIN_MM||(h.rainChance??0)>=RAIN_RISK)??null;
 if(risk)return {status:'risk',until,hours:window,firstRain:risk};
 return {status:until>now?'absorbing':'ok',until,hours:window,firstRain:null};
}
export type SprayWindow={start:string,end:string,hours:number,maxWind:number};
/**
 * Consecutive hours from `now` with no rain, wind up to the limit, gusts below twice the limit and temperature
 * between 5 and 25 °C, followed by at least `dryHours` without rain so the product can dry.
 */
export function sprayWindows(hours:HourWeather[],now:string,dryHours=defaultRainfastHours,limit=48):SprayWindow[]{
 const ahead=hours.filter(h=>h.time>=now.slice(0,13)+':00').slice(0,limit);
 const wet=(h:HourWeather)=>h.precipitation>=RAIN_MM||(h.rainChance??0)>=RAIN_RISK;
 const good=ahead.map((h,i)=>!wet(h)&&h.wind<=sprayWindLimit&&h.gusts<=sprayWindLimit*2&&h.temperature>=5&&h.temperature<=25&&ahead.slice(i+1,i+1+dryHours).length===dryHours&&ahead.slice(i+1,i+1+dryHours).every(x=>!wet(x)));
 const windows:SprayWindow[]=[];
 good.forEach((ok,i)=>{
  if(!ok)return;
  const last=windows.at(-1);
  if(last&&good[i-1]){last.end=addHours(ahead[i].time,1);last.hours++;last.maxWind=Math.max(last.maxWind,ahead[i].wind)}
  else windows.push({start:ahead[i].time,end:addHours(ahead[i].time,1),hours:1,maxWind:ahead[i].wind});
 });
 return windows.filter(w=>w.hours>=2);
}
/** Coldest hour of each coming night (18:00–09:00) when it reaches 0 °C or below. */
export function nightFrosts(hours:HourWeather[],now:string){
 const nights=new Map<string,HourWeather>();
 for(const h of hours){
  if(h.time<now.slice(0,13)+':00')continue;
  const hour=Number(h.time.slice(11,13));if(hour>9&&hour<18)continue;
  const night=hour>=18?h.time.slice(0,10):addHours(h.time,-24).slice(0,10);
  const coldest=nights.get(night);if(!coldest||h.temperature<coldest.temperature)nights.set(night,h);
 }
 return [...nights.entries()].filter(([,h])=>h.temperature<=0).map(([night,h])=>({night,time:h.time,temperature:h.temperature}));
}
