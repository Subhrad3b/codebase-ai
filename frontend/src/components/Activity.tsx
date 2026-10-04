import { Check, ChevronDown, ChevronRight, CircleAlert, LoaderCircle, SearchCode } from 'lucide-react'
import { useState } from 'react'
import type { ActivityStep, Source } from '../types'

export function Activity({steps,sources,pending,onOpen}:{steps:ActivityStep[];sources:Source[];pending?:boolean;onOpen:(path:string,line:number)=>void}){
 const [open,setOpen]=useState(true)
 if(!steps.length&&!pending)return null
 return <div className="mb-4 text-xs text-neutral-500">
  <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-2 rounded-lg py-1.5 hover:text-neutral-300">{pending?<LoaderCircle size={13} className="animate-spin"/>:<SearchCode size={13}/>}<span>{pending?'Working':'Details'}</span>{open?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>
  {open&&<div className="mt-1 space-y-2 border-l border-neutral-700 pl-4">{steps.map((step,index)=><div key={`${step.label}-${index}`} className="flex gap-2">{step.state==='active'?<LoaderCircle size={12} className="mt-0.5 shrink-0 animate-spin"/>:step.state==='error'?<CircleAlert size={12} className="mt-0.5 shrink-0 text-red-400"/>:<Check size={12} className="mt-0.5 shrink-0"/>}<div><div className="text-neutral-400">{step.label}</div>{step.detail&&<div className="mt-0.5 text-neutral-600">{step.detail}</div>}</div></div>)}
   {sources.length>0&&<div className="pt-1">{sources.slice(0,3).map(source=><button key={source.id} onClick={()=>onOpen(source.file_path,source.start_line)} className="block w-full truncate py-0.5 text-left text-neutral-400 hover:text-white">{source.file_path}:{source.start_line}-{source.end_line}</button>)}</div>}
  </div>}
 </div>
}
