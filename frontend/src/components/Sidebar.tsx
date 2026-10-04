import { ChevronDown, ChevronRight, FolderGit2, MessageSquare, PenSquare, RefreshCw, Settings, Sparkles } from 'lucide-react'
import type { Conversation, Repository } from '../types'

export function Sidebar({repositories,active,expanded,conversations,onSelect,onToggle,onChat,onChoose,onSync,onNew}:{repositories:Repository[];active?:string;expanded?:string;conversations:Conversation[];onSelect:(id:string)=>void;onToggle:(id:string)=>void;onChat:(chat:Conversation)=>void;onChoose:()=>void;onSync:(id:string)=>void;onNew:()=>void}){
 return <aside className="flex w-[248px] shrink-0 flex-col border-r border-border bg-surface">
  <div className="flex items-center gap-2 px-4 py-4">
   <div className="grid h-6 w-6 place-items-center rounded-md bg-accent text-white"><Sparkles size={13}/></div>
   <h1 className="text-[13px] font-semibold tracking-tight text-neutral-100">Codebase AI</h1>
  </div>

  <div className="px-2">
   <button onClick={onNew} disabled={!active} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-neutral-300 transition hover:bg-surface3 disabled:opacity-30">
    <PenSquare size={15}/> New chat
   </button>
   <button onClick={onChoose} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-neutral-300 transition hover:bg-surface3">
    <FolderGit2 size={15}/> Add project
   </button>
  </div>

  <div className="mt-5 flex-1 overflow-y-auto px-2">
   <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wide text-subtle">Projects</p>
   <div className="space-y-0.5">
    {repositories.length===0&&<p className="px-2.5 py-2 text-[12px] text-subtle">No projects yet</p>}
    {repositories.map(repo=>
     <div key={repo.id}>
      <div className={`group flex items-center rounded-lg ${active===repo.id?'bg-surface3':'hover:bg-surface2'}`}>
       <button title={expanded===repo.id?'Collapse':'Expand'} onClick={()=>onToggle(repo.id)} className="rounded p-1.5 text-subtle">
        {expanded===repo.id?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
       </button>
       <button onClick={()=>onSelect(repo.id)} className="min-w-0 flex-1 py-2 pr-1 text-left">
        <div className="truncate text-[13px] text-neutral-200">{repo.name}</div>
       </button>
       <button title="Sync changes" onClick={()=>onSync(repo.id)} className="mr-1 rounded-md p-1.5 text-subtle opacity-0 transition hover:bg-surface3 hover:text-neutral-200 group-hover:opacity-100">
        <RefreshCw size={12}/>
       </button>
      </div>
      {expanded===repo.id&&<div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
       {active===repo.id&&conversations.length?conversations.map(chat=>
        <button key={chat.id} onClick={()=>onChat(chat)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-subtle transition hover:bg-surface2 hover:text-neutral-200">
         <MessageSquare size={12} className="shrink-0"/>
         <span className="truncate">{chat.title}</span>
        </button>
       ):<p className="px-2 py-1.5 text-[12px] text-subtle">No chats yet</p>}
      </div>}
     </div>
    )}
   </div>
  </div>

  <div className="border-t border-border px-2 py-2">
   <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-subtle transition hover:bg-surface2 hover:text-neutral-200">
    <Settings size={15}/> Settings
   </button>
  </div>
 </aside>
}
