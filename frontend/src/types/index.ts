export interface Repository { id:string; name:string; path:string; status:string; file_count:number; chunk_count:number }
export interface RepoFile { path:string; modified_time:number; chunk_count:number }
export interface Source { id:string; file_path:string; language:string; start_line:number; end_line:number; symbol?:string; content:string; score:number }
export interface Message { id:string; role:'user'|'assistant'; content:string; sources?:Source[]; activity?:ActivityStep[]; pending?:boolean; error?:boolean }
export interface IndexProgress { repository_id:string; stage:string; percent:number; message?:string; unchanged?:number; modified?:number; added?:number; deleted?:number }
export interface ActivityStep { label:string; detail?:string; state:'active'|'done'|'error' }
export interface Conversation { id:string; repository_id:string; title:string; message_count:number; created_at:string; updated_at:string }

