import { FileCode2, X } from 'lucide-react'
import type { RepoFile } from '../types'

export function Explorer({files,onOpen,onClose}:{files:RepoFile[];onOpen:(path:string)=>void;onClose:()=>void}){
 return <aside className="fixed bottom-4 left-[264px] top-[72px] z-20 flex w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
  <div className="flex items-center justify-between border-b border-border px-4 py-3">
   <span className="text-[13px] font-medium text-neutral-200">Files</span>
   <button aria-label="Close files" onClick={onClose} className="rounded-md p-1 text-subtle transition hover:bg-surface3 hover:text-neutral-100"><X size={15}/></button>
  </div>
  <div className="flex-1 overflow-y-auto p-2">
   {files.map(file=>
    <button key={file.path} onClick={()=>onOpen(file.path)} title={file.path} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-neutral-400 transition hover:bg-surface2 hover:text-neutral-100">
     <FileCode2 size={13} className="shrink-0 text-subtle"/>
     <span className="truncate font-mono">{file.path}</span>
    </button>
   )}
  </div>
 </aside>
}
