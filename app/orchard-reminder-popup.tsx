'use client';
import {useState} from 'react';
import {BellRing,Check,Clock} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {duePlans,today,type OrchardRecord,type Plot,type Plan} from '@/lib/orchard';
import {stageLabel} from '@/lib/growth-stages';

// Reminders hidden on this device, as plan id → last day they stay hidden. Kept per device, like a dismissed alert.
const storageKey='moj-sad-reminders-hidden';
function readHidden():Record<string,string>{try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return {}}}
function writeHidden(hidden:Record<string,string>){try{localStorage.setItem(storageKey,JSON.stringify(hidden))}catch{/* Storage is optional. */}}
export function daysLeft(date:string,onDate:string){return Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(onDate+'T12:00:00Z'))/86400000)}
export function whenText(date:string,onDate:string){
 const d=daysLeft(date,onDate);
 return d===0?'dziś':d===1?'jutro':d>1?`za ${d} dni`:d===-1?'wczoraj — po terminie':`po terminie ${-d} dni`;
}

/** Pops up once a day with reminders whose lead time has started; each can be completed or postponed to tomorrow. */
export default function ReminderPopup({records,plots,enabled,onComplete}:{records:OrchardRecord[],plots:Plot[],enabled:boolean,onComplete:(plan:Plan)=>Promise<void>}){
 const [hidden,setHidden]=useState<Record<string,string>>(readHidden);
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
 const day=today();
 const due=duePlans(records,day).filter(p=>!(hidden[p.id]&&hidden[p.id]>=day));
 function hide(ids:string[]){
  // Drop entries that ended before today so the stored list does not grow forever.
  const next=Object.fromEntries(Object.entries({...hidden,...Object.fromEntries(ids.map(id=>[id,day]))}).filter(([,until])=>until>=day));
  writeHidden(next);setHidden(next);setError('');
 }
 async function complete(plan:Plan){
  setBusy(plan.id);setError('');
  try{await onComplete({...plan,completed:true})}catch(e){setError((e as Error).message)}finally{setBusy(null)}
 }
 const plotName=(id:string|null)=>plots.find(p=>p.id===id)?.name??'Cały sad';
 return <Dialog open={enabled&&due.length>0} onOpenChange={open=>{if(!open)hide(due.map(p=>p.id))}}>
  <DialogContent className="dialog-box reminder-popup">
   <div className="reminder-head"><span className="reminder-bell"><BellRing size={22}/></span><div><DialogTitle>{due.length===1?'Przypomnienie':`Przypomnienia (${due.length})`}</DialogTitle><DialogDescription>Zbliżające się lub zaległe zadania w sadzie.</DialogDescription></div></div>
   <ul className="reminder-list">{due.map(p=>{const late=daysLeft(p.date,day)<0;return <li key={p.id} className={late?'late':''}>
    <strong>{p.name}</strong>
    <span className="reminder-when">{new Date(p.date+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})} · <b>{whenText(p.date,day)}</b></span>
    <span className="muted">{p.fruit==='sour'?'Wiśnie':'Czereśnie'} · {plotName(p.plotId)}{p.stage?` · ${stageLabel(p.stage)}`:''}</span>
    {p.note&&<p className="note-text">{p.note}</p>}
    <div className="reminder-actions"><button type="button" className="button" disabled={busy!==null} onClick={()=>void complete(p)}><Check size={16}/>{busy===p.id?'Zapisywanie…':'Zrobione'}</button><button type="button" className="button secondary" disabled={busy!==null} onClick={()=>hide([p.id])}><Clock size={16}/>Przypomnij jutro</button></div>
   </li>})}</ul>
   {error&&<p className="notice error" role="alert">{error}</p>}
   <button type="button" className="link-btn reminder-close" onClick={()=>hide(due.map(p=>p.id))}>Zamknij — przypomnij jutro</button>
  </DialogContent>
 </Dialog>;
}
