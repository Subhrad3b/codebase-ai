import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

function CodeBlock({lang,text}:{lang:string,text:string}){
 const [copied,setCopied]=useState(false)
 const copy=()=>{void navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1200)}
 return <div className="group relative my-3 overflow-hidden rounded-lg border border-border">
  <div className="flex items-center justify-between bg-surface2 px-3 py-1.5">
   <span className="text-[11px] text-subtle">{lang||'text'}</span>
   <button onClick={copy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-subtle transition hover:bg-surface3 hover:text-neutral-200">
    {copied?<><Check size={12}/> Copied</>:<><Copy size={12}/> Copy</>}
   </button>
  </div>
  <SyntaxHighlighter style={oneDark} language={lang} customStyle={{margin:0,background:'#121214',padding:'.9rem 1rem'}}>{text}</SyntaxHighlighter>
 </div>
}

export function Markdown({children,onFile}:{children:string,onFile?:(path:string)=>void}){
 return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
  code({className,children,...props}){
   const lang=/language-(\w+)/.exec(className||'')?.[1]
   const text=String(children).replace(/\n$/,'')
   return lang?<CodeBlock lang={lang} text={text}/>:<code className="rounded bg-surface3 px-1.5 py-0.5" {...props}>{children}</code>
  },
  a({href,children}){return <button className="text-accent underline-offset-2 hover:underline" onClick={()=>href&&onFile?.(href)}>{children}</button>}
 }}>{children}</ReactMarkdown>
}
