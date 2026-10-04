import { useEffect, useRef, useState } from 'react'
import { Braces, PanelRight, RefreshCw, Send, Square, Trash2 } from 'lucide-react'
import { api } from './services/api'
import type { ActivityStep, Conversation, IndexProgress, Message, RepoFile, Repository, Source } from './types'
import { Sidebar } from './components/Sidebar'; import { Explorer } from './components/Explorer'; import { ContextPanel } from './components/ContextPanel'; import { Markdown } from './components/Markdown'
import { IndexProgressPanel } from './components/IndexProgress'; import { Activity } from './components/Activity'
import { CodeViewer } from './components/CodeViewer'

export default function App(){
 const [repos,setRepos]=useState<Repository[]>([]),[active,setActive]=useState<string>(),[expanded,setExpanded]=useState<string>(),[conversations,setConversations]=useState<Conversation[]>([]),[files,setFiles]=useState<RepoFile[]>([]),[messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[sources,setSources]=useState<Source[]>([]),[indexProgress,setIndexProgress]=useState<IndexProgress>(),[showContext,setShowContext]=useState(false),[showExplorer,setShowExplorer]=useState(false),[viewer,setViewer]=useState<{path:string,content:string,line?:number}>(),[conversation,setConversation]=useState<string>(),abort=useRef<AbortController|undefined>(undefined),bottom=useRef<HTMLDivElement>(null)
 const refresh=()=>api.repositories().then(setRepos).catch(()=>{})
 useEffect(()=>{void refresh()},[])
 useEffect(()=>{if(active){void api.files(active).then(setFiles);void api.conversations(active).then(setConversations)}else{setFiles([]);setConversations([])}},[active,repos])
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages])
 const index=async(path:string)=>{const {repository_id}=await api.index(path);setActive(repository_id);setExpanded(repository_id);setConversation(undefined);setMessages([]);setSources([]);setShowExplorer(false);setIndexProgress({repository_id,stage:'scanning',percent:1,message:'Preparing repository scan…'});const timer=setInterval(async()=>{try{const status=await api.status(repository_id) as unknown as IndexProgress;setIndexProgress(status);void refresh();if(status.stage==='complete'||status.stage==='error')clearInterval(timer)}catch{setIndexProgress(p=>p?{...p,stage:'error',message:'Unable to read indexing progress'}:p);clearInterval(timer)}},500)}
 const chooseRepository=async()=>{try{const selected=await api.selectFolder();if(selected.path)await index(selected.path)}catch(error){alert((error as Error).message)}}
 const syncRepository=async(repositoryId:string)=>{await api.sync(repositoryId);if(repositoryId!==active){setActive(repositoryId);setExpanded(repositoryId);setConversation(undefined);setMessages([]);setSources([]);setShowExplorer(false)}setIndexProgress({repository_id:repositoryId,stage:'scanning',percent:1,message:'Checking for changed files…'});const timer=setInterval(async()=>{const status=await api.status(repositoryId) as unknown as IndexProgress;setIndexProgress(status);void refresh();if(status.stage==='complete'||status.stage==='error'){clearInterval(timer);if(status.stage==='complete')void api.files(repositoryId).then(setFiles)}},500)}
 const openFile=async(path:string,line?:number)=>{if(!active)return; const result=await api.file(active,path); setViewer({...result,line})}
 const newChat=()=>{setConversation(undefined);setMessages([]);setSources([]);setShowExplorer(false)}
 const selectProject=(repositoryId:string)=>{if(repositoryId!==active){setActive(repositoryId);setExpanded(repositoryId);newChat()}else setExpanded(repositoryId)}
 const toggleProject=(repositoryId:string)=>{if(expanded===repositoryId){setExpanded(undefined);return}selectProject(repositoryId);setExpanded(repositoryId)}
 const openConversation=async(chat:Conversation)=>{if(chat.repository_id!==active)setActive(chat.repository_id);setExpanded(chat.repository_id);setConversation(chat.id);setSources([]);setShowExplorer(false);const history=await api.messages(chat.id);setMessages(history.map(item=>({id:String(item.id),role:item.role,content:item.content})))}
 const send=async(text=input)=>{if(!active||!text.trim()||busy)return; const user:Message={id:crypto.randomUUID(),role:'user',content:text}; const assistant:Message={id:crypto.randomUUID(),role:'assistant',content:'',pending:true,sources:[],activity:[{label:'Searching the repository',detail:`Query: ${text}`,state:'active'}]}; setMessages(m=>[...m,user,assistant]); setInput('');setBusy(true);setSources([]);abort.current=new AbortController();
  const updateActivity=(step:ActivityStep)=>setMessages(m=>m.map(x=>x.id===assistant.id?{...x,activity:[...(x.activity||[]).map(s=>s.state==='active'?{...s,state:'done' as const}:s),step]}:x))
  try{await api.chat(active,text,conversation,abort.current.signal,event=>{if(event.type==='status'){updateActivity({label:event.stage==='retrieval'?'Repository search complete':'Generating answer',detail:event.message,state:event.stage==='generation'?'active':'done'})} if(event.type==='meta'){setConversation(event.conversation_id);setSources(event.sources);setMessages(m=>m.map(x=>x.id===assistant.id?{...x,sources:event.sources}:x))} if(event.type==='token')setMessages(m=>m.map(x=>x.id===assistant.id?{...x,content:x.content+event.content}:x)); if(event.type==='done')updateActivity({label:'Answer complete',detail:'Grounded in the retrieved repository context',state:'done'}); if(event.type==='error')setMessages(m=>m.map(x=>x.id===assistant.id?{...x,content:event.message,error:true,activity:[...(x.activity||[]),{label:'Generation failed',detail:event.message,state:'error'}]}:x))})}catch(e){if((e as Error).name!=='AbortError')setMessages(m=>m.map(x=>x.id===assistant.id?{...x,content:(e as Error).message,error:true,activity:[...(x.activity||[]),{label:'Request failed',detail:(e as Error).message,state:'error'}]}:x))}finally{setBusy(false);setMessages(m=>m.map(x=>x.id===assistant.id?{...x,pending:false,activity:(x.activity||[]).map(s=>s.state==='active'?{...s,state:'done' as const}:s)}:x));void api.conversations(active).then(setConversations)}}
 const repo=repos.find(r=>r.id===active)
 return <div className="flex h-screen bg-bg text-neutral-100">
  <Sidebar repositories={repos} active={active} expanded={expanded} conversations={conversations} onSelect={selectProject} onToggle={toggleProject} onChat={openConversation} onChoose={chooseRepository} onSync={syncRepository} onNew={newChat}/>
  {showExplorer&&<Explorer files={files} onOpen={openFile} onClose={()=>setShowExplorer(false)}/>}
  <main className="relative flex min-w-0 flex-1 flex-col">
   <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-4">
    <div className="flex items-center gap-2">
     <button title="Browse files" onClick={()=>setShowExplorer(v=>!v)} disabled={!active} className="rounded-md p-1.5 text-subtle transition hover:bg-surface2 hover:text-neutral-100 disabled:opacity-30"><Braces size={16}/></button>
     <span className="text-[13px] font-medium text-neutral-300">{repo?.name||'Codebase AI'}</span>
    </div>
    <div className="flex items-center gap-0.5">
     {active&&<button title="Sync changes" onClick={()=>void syncRepository(active)} className="rounded-md p-1.5 text-subtle transition hover:bg-surface2 hover:text-neutral-100"><RefreshCw size={15}/></button>}
     <button title="Clear chat" onClick={newChat} className="rounded-md p-1.5 text-subtle transition hover:bg-surface2 hover:text-neutral-100"><Trash2 size={15}/></button>
     <button title="View sources" onClick={()=>setShowContext(v=>!v)} className={`rounded-md p-1.5 transition hover:bg-surface2 ${showContext?'text-neutral-100':'text-subtle hover:text-neutral-100'}`}><PanelRight size={16}/></button>
    </div>
   </header>

   <section className="flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-[720px] px-5 py-8 md:px-8">
     {messages.length===0?
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
       <h2 className="text-[26px] font-semibold tracking-tight text-neutral-100">{repo?'What can I help you understand?':'Choose a project to begin'}</h2>
       <p className="mt-2 text-[14px] text-subtle">{repo?`Ask anything about ${repo.name}.`:'Your code stays local on this machine.'}</p>
       {repo&&<div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {['Explain this project','Where are the entry points?','Show the main architecture','Find potential issues'].map(q=>
         <button key={q} onClick={()=>send(q)} className="rounded-xl border border-border px-4 py-3 text-left text-[13.5px] text-neutral-400 transition hover:border-border-light hover:bg-surface2 hover:text-neutral-100">{q}</button>
        )}
       </div>}
      </div>
      :messages.map((m,i)=>
       <article key={m.id} className={`mb-7 animate-fade-in ${m.role==='user'?'ml-auto max-w-[80%] rounded-2xl bg-surface2 px-4 py-2.5':'max-w-none'}`}>
        {m.role==='assistant'&&<div className="mb-2.5 flex items-center justify-between">
         <span className="text-[13px] font-medium text-neutral-300">Codebase AI</span>
         {i===messages.length-1&&!busy&&<button title="Regenerate" className="rounded-md p-1 text-subtle transition hover:bg-surface2 hover:text-neutral-300" onClick={()=>{const previous=messages.slice(0,i).reverse().find(x=>x.role==='user');if(previous){setMessages(messages.slice(0,i));void send(previous.content)}}}><RefreshCw size={13}/></button>}
        </div>}
        {m.role==='assistant'&&<Activity steps={m.activity||[]} sources={m.sources||[]} pending={m.pending} onOpen={openFile}/>}
        <div className={`markdown-body ${m.error?'text-red-300':''}`}><Markdown onFile={p=>openFile(p)}>{m.content||(m.pending?'Thinking…':'')}</Markdown></div>
       </article>
      )}
     <div ref={bottom}/>
    </div>
   </section>

   <footer className="shrink-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-2">
    <div className="mx-auto max-w-[720px]">
     <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 transition focus-within:border-border-light">
      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={active?'Message your codebase':'Select a project first'} disabled={!active} rows={1} className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[14.5px] leading-6 text-neutral-100 outline-none placeholder:text-subtle"/>
      {busy?<button aria-label="Stop generation" onClick={()=>abort.current?.abort()} className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-black transition hover:bg-white"><Square size={13} fill="currentColor"/></button>
       :<button aria-label="Send message" onClick={()=>send()} disabled={!input.trim()||!active} className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-black transition hover:bg-white disabled:bg-surface3 disabled:text-subtle"><Send size={15}/></button>}
     </div>
     <p className="mt-2 text-center text-[11px] text-subtle">Local answers can be inaccurate. Check cited source files.</p>
    </div>
   </footer>
  </main>
  {showContext&&<ContextPanel sources={sources} onOpen={openFile} onClose={()=>setShowContext(false)}/>}
  {indexProgress&&<IndexProgressPanel progress={indexProgress} onClose={()=>setIndexProgress(undefined)}/>}
  {viewer&&<CodeViewer path={viewer.path} content={viewer.content} line={viewer.line} onClose={()=>setViewer(undefined)}/>}
 </div>
}

