import type { Conversation, Repository, RepoFile } from '../types'
const json = async <T>(response:Response):Promise<T> => { if(!response.ok) throw new Error((await response.json().catch(()=>null))?.detail || response.statusText); return response.json() }
export const api = {
  repositories:()=>fetch('/api/repositories').then(r=>json<Repository[]>(r)),
  conversations:(repositoryId:string)=>fetch(`/api/repositories/${encodeURIComponent(repositoryId)}/conversations`).then(r=>json<Conversation[]>(r)),
  messages:(conversationId:string)=>fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`).then(r=>json<Array<{id:number;role:'user'|'assistant';content:string}>>(r)),
  index:(path:string)=>fetch('/api/repositories/index',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path})}).then(r=>json<{repository_id:string}>(r)),
  selectFolder:()=>fetch('/api/repositories/select-folder',{method:'POST'}).then(r=>json<{cancelled:boolean,path?:string}>(r)),
  sync:(repositoryId:string)=>fetch(`/api/repositories/${encodeURIComponent(repositoryId)}/sync`,{method:'POST'}).then(r=>json<{repository_id:string}>(r)),
  files:(repositoryId:string)=>fetch(`/api/files?repository_id=${encodeURIComponent(repositoryId)}`).then(r=>json<RepoFile[]>(r)),
  file:(repositoryId:string,path:string)=>fetch(`/api/files/content?repository_id=${encodeURIComponent(repositoryId)}&path=${encodeURIComponent(path)}`).then(r=>json<{path:string,content:string}>(r)),
  status:(repositoryId:string)=>fetch(`/api/index/status?repository_id=${repositoryId}`).then(r=>json<Record<string,number|string>>(r)),
  chat:async(repositoryId:string,message:string,conversationId:string|undefined,signal:AbortSignal,onEvent:(event:any)=>void)=>{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repository_id:repositoryId,message,conversation_id:conversationId}),signal});
    if(!response.ok||!response.body) throw new Error('Chat request failed');
    const reader=response.body.getReader(), decoder=new TextDecoder(); let buffer='';
    while(true){ const {done,value}=await reader.read(); if(done)break; buffer+=decoder.decode(value,{stream:true}); const events=buffer.split('\n\n'); buffer=events.pop()||''; for(const event of events){const data=event.split('\n').find(x=>x.startsWith('data: ')); if(data)onEvent(JSON.parse(data.slice(6)));}}
  }
}

