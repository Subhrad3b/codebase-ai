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
  <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-panel">
   <div className="mb-6 flex items-start justify-between">
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Local indexing</p>
     <h2 className="mt-1 text-lg font-semibold text-neutral-100">Understanding your repository</h2>
     <p className="mt-1.5 text-[13px] text-subtle">{progress.message||'Preparing the local index…'}</p>
    </div>
    {complete&&<button onClick={onClose} className="rounded-md p-1.5 text-subtle transition hover:bg-surface3 hover:text-neutral-100"><X size={16}/></button>}
   </div>
   <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface3">
    <div className="h-full rounded-full bg-accent transition-all duration-500" style={{width:`${progress.percent||2}%`}}/>
   </div>
   <div className="space-y-2">
    {stages.map((stage,index)=>{
     const Icon=stage.icon;const done=complete||index<current;const active=index===current&&!complete
     return <div key={stage.id} className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 ${active?'border-accent/40 bg-accent/5':'border-border'}`}>
      {done?<CheckCircle2 size={16} className="text-accent"/>:active?<LoaderCircle size={16} className="animate-spin text-accent"/>:<Icon size={16} className="text-subtle"/>}
      <span className={`text-[13px] ${done||active?'text-neutral-200':'text-subtle'}`}>{stage.label}</span>
     </div>
    })}
   </div>
   {(progress.added!==undefined||complete)&&<div className="mt-5 grid grid-cols-4 gap-2 text-center text-[12px]">
    <Stat label="New" value={progress.added}/><Stat label="Modified" value={progress.modified}/><Stat label="Unchanged" value={progress.unchanged}/><Stat label="Deleted" value={progress.deleted}/>
   </div>}
   <p className="mt-5 text-center text-[11px] text-subtle">All parsing and embeddings stay on this machine.</p>
  </div>
 </div>
}
function Stat({label,value=0}:{label:string,value?:number}){return <div className="rounded-lg bg-surface2 p-2"><div className="font-semibold text-neutral-200">{value}</div><div className="text-subtle">{label}</div></div>}
