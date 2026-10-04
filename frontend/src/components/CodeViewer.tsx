import { X } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const languages:Record<string,string>={py:'python',js:'javascript',jsx:'jsx',ts:'typescript',tsx:'tsx',java:'java',kt:'kotlin',cpp:'cpp',c:'c',h:'c',hpp:'cpp',go:'go',rs:'rust',php:'php',rb:'ruby',swift:'swift',dart:'dart',html:'html',css:'css',scss:'scss',json:'json',yaml:'yaml',yml:'yaml',md:'markdown',sql:'sql',sh:'bash',ps1:'powershell'}

export function CodeViewer({path,content,line,onClose}:{path:string;content:string;line?:number;onClose:()=>void}){
 const extension=path.split('.').pop()?.toLowerCase()||''
 return <div className="fixed inset-0 z-40 flex bg-black/70 p-4 backdrop-blur-sm md:p-8">
  <div className="m-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
   <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
    <span className="truncate font-mono text-[12.5px] text-neutral-300">{path}{line?`:${line}`:''}</span>
    <button aria-label="Close code viewer" onClick={onClose} className="rounded-md p-1.5 text-subtle transition hover:bg-surface3 hover:text-neutral-100"><X size={16}/></button>
   </div>
   <div className="flex-1 overflow-auto text-[13px]">
    <SyntaxHighlighter language={languages[extension]||'text'} style={oneDark} showLineNumbers wrapLongLines={false} lineProps={(number)=>({style:{display:'block',background:number===line?'rgba(78,140,255,.12)':'transparent',borderLeft:number===line?'2px solid #4e8cff':'2px solid transparent'}})} customStyle={{margin:0,minHeight:'100%',background:'#161618',padding:'1.25rem 0'}} lineNumberStyle={{minWidth:'3.5em',paddingRight:'1.2em',color:'#555'}}>{content}</SyntaxHighlighter>
   </div>
  </div>
 </div>
}
