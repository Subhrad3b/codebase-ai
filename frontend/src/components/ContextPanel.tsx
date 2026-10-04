import { FileText, X } from 'lucide-react'
import type { Source } from '../types'

export function ContextPanel({sources,onOpen,onClose}:{sources:Source[];onOpen:(p:string,l:number)=>void;onClose:()=>void}){
 return <aside className="fixed bottom-4 right-4 top-[72px] z-20 flex w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
  <div className="flex items-center justify-between border-b border-border px-4 py-3">
   <span className="text-[13px] font-medium text-neutral-200">Sources</span>
   <button aria-label="Close sources" onClick={onClose} className="rounded-md p-1 text-subtle transition hover:bg-surface3 hover:text-neutral-100"><X size={15}/></button>
  </div>
  <div className="space-y-0.5 overflow-y-auto p-2">
   {sources.length?sources.map(s=>
    <button key={s.id} onClick={()=>onOpen(s.file_path,s.start_line)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface2">
     <FileText size={14} className="mt-0.5 shrink-0 text-subtle"/>
     <div className="min-w-0">
      <div className="truncate font-mono text-[12.5px] text-neutral-200">{s.file_path}</div>
      <div className="mt-0.5 text-[11.5px] text-subtle">Lines {s.start_line}–{s.end_line}{s.symbol?` · ${s.symbol}`:''}</div>
     </div>
    </button>
   ):<p className="px-3 py-10 text-center text-[13px] text-subtle">Sources appear after a response.</p>}
  </div>
 </aside>
}
