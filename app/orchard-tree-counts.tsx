'use client';
import {varieties,plotTreeCounts,type Plot,type OrchardRecord} from '@/lib/orchard';
import {useState} from 'react';

export function VarietyTreeFields({selected,counts,total,onToggle,onCount,onAdd}:{selected:string[],counts:Record<string,string>,total:string,onToggle:(variety:string,checked:boolean)=>void,onCount:(variety:string,value:string)=>void,onAdd:(variety:string)=>void}){
 const [custom,setCustom]=useState('');
 const options=Array.from(new Set([...varieties.filter(v=>v!=='Łutówka'),...selected,...Object.keys(counts)]));
 const duplicate=options.some(v=>v.toLocaleLowerCase('pl')===custom.trim().toLocaleLowerCase('pl'))||custom.trim().toLocaleLowerCase('pl')==='łutówka';
 const assigned=selected.reduce((n,v)=>n+Number(counts[v]||0),0),remaining=Number(total||0)-assigned;
 return <fieldset className="variety-count-picker"><legend>Odmiany i liczba drzew w tym sadzie</legend>
  {options.map(v=><div className="variety-count-row" key={v}>
   <label><input type="checkbox" checked={selected.includes(v)} onChange={e=>onToggle(v,e.target.checked)}/>{v}</label>
   <input aria-label={`Liczba drzew odmiany ${v}`} type="number" min="0" max="1000000" step="1" inputMode="numeric" disabled={!selected.includes(v)} value={counts[v]??''} onChange={e=>onCount(v,e.target.value)} placeholder="Nie podano"/>
  </div>)}
  <div className="custom-variety"><label htmlFor="custom-variety">Inna odmiana czereśni</label><div><input id="custom-variety" maxLength={80} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Wpisz nazwę odmiany"/><button type="button" className="button secondary" disabled={!custom.trim()||duplicate||options.length>=50} onClick={()=>{onAdd(custom.trim());setCustom('')}}>Dodaj odmianę</button></div>{duplicate&&<p className="progress-note">Ta odmiana jest już na liście lub należy do wiśni.</p>}</div>
  <p className={remaining<0?'notice error':'notice'} aria-live="polite">Przypisano <strong>{assigned}</strong> z <strong>{total||0}</strong> drzew. {remaining>=0?`Bez przypisanej odmiany: ${remaining}.`:`Przekroczono liczbę drzew o ${-remaining}.`}</p>
  <p className="progress-note">To podział początkowej liczby drzew jednej kwatery. Puste liczby możesz uzupełnić później. Kolejne ubytki i dosadzenia zapisuj osobno, wybierając odmianę.</p>
 </fieldset>;
}

export function PlotTreeSummary({plot,records}:{plot:Plot,records:OrchardRecord[]}){
 const counts=plotTreeCounts(plot,records);
 return <div className="tree-breakdown"><h3>Drzewa według odmiany · obecnie</h3><dl>
  {counts.rows.map(row=><div key={row.variety}><dt>{row.variety}</dt><dd>{row.trees===null?'Nie podano':`${row.trees} drzew`}</dd></div>)}
  {counts.unassigned>0&&<div className="muted"><dt>Bez przypisanej odmiany</dt><dd>{counts.unassigned} drzew</dd></div>}
 </dl></div>;
}
