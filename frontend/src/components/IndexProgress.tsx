import { CheckCircle2, Database, FileSearch, LoaderCircle, X } from 'lucide-react'
import type { IndexProgress as Progress } from '../types'

const stages = [
  {id:'scanning',label:'Scanning files',icon:FileSearch},
  {id:'chunking',label:'Parsing and chunking',icon:Database},
  {id:'embedding',label:'Generating embeddings',icon:Database},
  {id:'complete',label:'Building local index',icon:CheckCircle2},
]

export function IndexProgressPanel({progress,onClose}:{progress:Progress;onClose:()=>void}){
 const current=Math.max(0,stages.findIndex(s=>s.id===progress.stage))
 const complete=progress.stage==='complete'
 return <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
  <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl">
   <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Local indexing</p><h2 className="mt-1 text-xl font-semibold">Understanding your repository</h2><p className="mt-2 text-sm text-slate-500">{progress.message||'Preparing the local index…'}</p></div>{complete&&<button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5"><X size={18}/></button>}</div>
   <div className="mb-6 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-accent transition-all duration-500" style={{width:`${progress.percent||2}%`}}/></div>
   <div className="space-y-3">{stages.map((stage,index)=>{const Icon=stage.icon;const done=complete||index<current;const active=index===current&&!complete;return <div key={stage.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${active?'border-accent/40 bg-accent/5':'border-line'}`}>{done?<CheckCircle2 size={18} className="text-accent"/>:active?<LoaderCircle size={18} className="animate-spin text-accent"/>:<Icon size={18} className="text-slate-600"/>}<span className={done||active?'text-sm text-slate-200':'text-sm text-slate-600'}>{stage.label}</span></div>})}</div>
   {(progress.added!==undefined||complete)&&<div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs"><Stat label="New" value={progress.added}/><Stat label="Modified" value={progress.modified}/><Stat label="Unchanged" value={progress.unchanged}/><Stat label="Deleted" value={progress.deleted}/></div>}
   <p className="mt-5 text-center text-[11px] text-slate-600">All parsing and embeddings stay on this machine.</p>
  </div>
 </div>
}
function Stat({label,value=0}:{label:string,value?:number}){return <div className="rounded-lg bg-black/20 p-2"><div className="font-semibold text-slate-200">{value}</div><div className="text-slate-600">{label}</div></div>}

