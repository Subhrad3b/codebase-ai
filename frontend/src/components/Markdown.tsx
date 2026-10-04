import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy } from 'lucide-react'
export function Markdown({children,onFile}:{children:string,onFile?:(path:string)=>void}){
 return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
  code({className,children,...props}){const lang=/language-(\w+)/.exec(className||'')?.[1]; const text=String(children).replace(/\n$/,''); return lang?<div className="group relative my-3 overflow-hidden rounded-xl border border-line"><button onClick={()=>navigator.clipboard.writeText(text)} className="absolute right-2 top-2 rounded bg-black/60 p-2 opacity-0 group-hover:opacity-100"><Copy size={14}/></button><SyntaxHighlighter style={oneDark} language={lang} customStyle={{margin:0,background:'#0a0f16'}}>{text}</SyntaxHighlighter></div>:<code className="rounded bg-white/10 px-1.5 py-0.5" {...props}>{children}</code>},
  a({href,children}){return <button className="text-accent underline" onClick={()=>href&&onFile?.(href)}>{children}</button>}
 }}>{children}</ReactMarkdown>
}

