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
  daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
  wind_speed_unit:'ms',timezone:'Europe/Warsaw',forecast_days:'5'});
 return 'https://api.open-meteo.com/v1/forecast?'+q.toString();
}
export type Forecast={time:string,temperature:number,feelsLike:number,humidity:number,precipitation:number,code:number,wind:number,gusts:number,isDay:boolean,
 days:{date:string,code:number,max:number,min:number,rain:number,rainChance:number|null,wind:number}[]};
export function parseForecast(json:unknown):Forecast{
 const j=json as {current?:Record<string,number|string>,daily?:Record<string,(number|string|null)[]>};
 const c=j?.current,d=j?.daily;
 if(!c||!d?.time)throw new Error('Nieprawidłowa odpowiedź serwisu pogodowego.');
 const n=(v:unknown)=>typeof v==='number'?v:Number(v);
 return {time:String(c.time),temperature:n(c.temperature_2m),feelsLike:n(c.apparent_temperature),humidity:n(c.relative_humidity_2m),precipitation:n(c.precipitation),code:n(c.weather_code),wind:n(c.wind_speed_10m),gusts:n(c.wind_gusts_10m),isDay:n(c.is_day)===1,
  days:d.time.map((date,i)=>({date:String(date),code:n(d.weather_code?.[i]),max:n(d.temperature_2m_max?.[i]),min:n(d.temperature_2m_min?.[i]),rain:n(d.precipitation_sum?.[i]??0),rainChance:d.precipitation_probability_max?.[i]==null?null:n(d.precipitation_probability_max[i]),wind:n(d.wind_speed_10m_max?.[i])}))};
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
