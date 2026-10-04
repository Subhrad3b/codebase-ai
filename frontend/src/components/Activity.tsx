import { Check, ChevronDown, ChevronRight, CircleAlert, LoaderCircle, SearchCode } from 'lucide-react'
import { useState } from 'react'
import type { ActivityStep, Source } from '../types'

export function Activity({steps,sources,pending,onOpen}:{steps:ActivityStep[];sources:Source[];pending?:boolean;onOpen:(path:string,line:number)=>void}){
 const [open,setOpen]=useState(false)
 if(!steps.length&&!pending)return null
 return <div className="mb-3 text-[12.5px]">
  <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-1.5 rounded-md py-1 text-subtle transition hover:text-neutral-300">
   {pending?<LoaderCircle size={13} className="animate-spin"/>:<SearchCode size={13}/>}
   <span>{pending?'Working':'Steps'}</span>
   {open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
  </button>
  {open&&<div className="mt-1 space-y-1.5 border-l border-border pl-3">
   {steps.map((step,index)=>
    <div key={`${step.label}-${index}`} className="flex gap-2">
     {step.state==='active'?<LoaderCircle size={12} className="mt-0.5 shrink-0 animate-spin text-accent"/>:step.state==='error'?<CircleAlert size={12} className="mt-0.5 shrink-0 text-red-400"/>:<Check size={12} className="mt-0.5 shrink-0 text-subtle"/>}
     <div>
      <div className="text-neutral-400">{step.label}</div>
      {step.detail&&<div className="mt-0.5 text-subtle">{step.detail}</div>}
     </div>
    </div>
   )}
   {sources.length>0&&<div className="pt-1">
    {sources.slice(0,3).map(source=>
     <button key={source.id} onClick={()=>onOpen(source.file_path,source.start_line)} className="block w-full truncate py-0.5 text-left font-mono text-[12px] text-subtle transition hover:text-neutral-200">
      {source.file_path}:{source.start_line}-{source.end_line}
     </button>
    )}
   </div>}
  </div>}
 </div>
}
