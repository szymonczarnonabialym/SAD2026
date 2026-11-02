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
