'use client';
import {type Plot} from '@/lib/orchard';
import {soilCategoryLabel,type SoilTest} from '@/lib/soil';
import {fertilizationAdvice,nutrientNames} from '@/lib/soil-fertilization';
import {normsSource} from '@/lib/soil-norms';

const fmt=(n:number)=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(n);
const day=(s:string)=>new Date(s+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric'});
const range=([a,b]:[number,number])=>a===b?fmt(a):`${fmt(a)}–${fmt(b)}`;
const toneOf=(label:string|null)=>label==='Niska'?'low':label==='Wysoka'?'high':'ok';

function PlaceAdvice({name,tests}:{name:string,tests:SoilTest[]}){
 const advice=fertilizationAdvice(tests);
 const based=[advice.top&&`0–20 cm: ${day(advice.top.date)}`,advice.sub&&`${advice.sub.depth||'20–40 cm'}: ${day(advice.sub.date)}`].filter(Boolean).join(' · ');
 return <div className="fertilization-place">
  <h3>{name}</h3>
  <p className="muted">Na podstawie ostatnich badań — {based}{advice.category?` · gleba ${soilCategoryLabel(advice.category).toLowerCase()}`:' · kategoria gleby niepodana'}</p>
  <div className="table-scroll"><table className="comparison-table"><thead><tr><th>Składnik</th><th>Warstwa 0–20 cm</th><th>Warstwa 20–40 cm</th><th>Dawka w sadzie<span>g/m² pow. nawożonej</span></th><th>Przed założeniem sadu<span>kg/ha pow. nawożonej</span></th></tr></thead><tbody>
   {advice.nutrients.map(n=><tr key={n.parameter}><th scope="row">{nutrientNames[n.parameter]}</th>
    <td>{n.topClass?<span className={'soil-norm '+toneOf(n.topClass)}>{n.topClass}</span>:'—'}</td>
    <td>{n.subClass?<><span className={'soil-norm '+toneOf(n.subClass)}>{n.subClass}</span>{n.correction!==0&&<small>dawka {n.correction>0?'+':'−'}20%</small>}</>:'—'}</td>
    <td>{!n.orchard?'—':n.orchard[1]===0?'Nie nawozić':<>{range(n.orchard)} g/m²<br/><small>{range([n.orchard[0]*10,n.orchard[1]*10])} kg/ha</small></>}</td>
    <td>{!n.planting?'—':n.planting[1]===0?'Nie nawozić':`${range(n.planting)} kg/ha`}</td></tr>)}
  </tbody></table></div>
  {!advice.top&&<p className="notice">Brak badania warstwy 0–20 cm. Instytut Ogrodnictwa wylicza dawkę podstawową z zasobności warstwy próchnicznej, a wynik z 20–40 cm tylko ją zwiększa lub zmniejsza o 20%. Bez badania 0–20 cm aplikacja pokazuje samą korektę.</p>}
  {advice.top&&!advice.category&&<p className="notice">Uzupełnij kategorię gleby w badaniu, aby wyliczyć dawki potasu i magnezu.</p>}
  <p className="progress-note">{advice.lime?advice.lime.dose>0?<>Wapnowanie: <strong>{advice.lime.dose} kg CaO na 100 m²</strong> ({fmt(advice.lime.dose*100)} kg CaO/ha) pow. nawożonej, przy pH {fmt(advice.lime.ph)} z warstwy {advice.lime.layer==='topsoil'?'0–20 cm':'20–40 cm'}. Jednorazowa dawka na 3–4 lata, w pasy wzdłuż rzędów. Przy niedoborze magnezu użyj wapna magnezowego.</>:<>Wapnowanie niepotrzebne przy pH {fmt(advice.lime.ph)} (warstwa {advice.lime.layer==='topsoil'?'0–20 cm':'20–40 cm'}).</>:'Wapnowanie: podaj pH i kategorię gleby, aby wyliczyć dawkę.'}</p>
 </div>;
}

export function SoilFertilization({tests,plots}:{tests:SoilTest[],plots:Plot[]}){
 const places=Array.from(new Set(tests.map(t=>t.plotId))).map(id=>({id,name:plots.find(p=>p.id===id)?.name??'Cały sad / bez kwatery',tests:tests.filter(t=>t.plotId===id)}));
 if(!places.length)return null;
 return <section className="panel fertilization"><h2>Zalecenia nawożenia</h2>
  {places.map(p=><PlaceAdvice key={p.id??'none'} name={p.name} tests={p.tests}/>)}
  <p className="progress-note">Dawki wg Instytutu Ogrodnictwa–PIB (Wójcik, 2021, tabele 6, 8, 10 i 12) dla metod Egnera-Riehma i Schachtschabela. Podane są w czystym składniku (P₂O₅, K₂O, MgO, CaO) na powierzchnię nawożoną — w sadzie zwykle pas herbicydowy lub ugór wzdłuż rzędów. Ilość nawozu policz z zawartości składnika na opakowaniu. W sadzie przy optymalnej zawartości fosforu nie nawozi się nim. To wskazówka orientacyjna; ostateczną dawkę skoryguj o wynik analizy liści i stan drzew. <a className="link-btn" href={normsSource} target="_blank" rel="noreferrer">Źródło</a></p>
 </section>;
}
