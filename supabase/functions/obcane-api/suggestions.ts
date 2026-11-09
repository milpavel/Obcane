export const suggestionOrigins=new Set(['https://prortyni.cz','https://www.prortyni.cz','https://obcane-pro-rtyni.pages.dev']);
export const suggestionCategories=['doprava','prostor','zelen','poradek','kultura','jine'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class FormError extends Error{constructor(message:string,public status=400){super(message);}}
function field(value:any,max:number,multiline=false){if(typeof value!=='string')throw new FormError('Zkontrolujte vyplněná pole.');const text=value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();if(text.length>max)throw new FormError('Některé pole je příliš dlouhé.');return multiline?text:text.replace(/\s+/g,' ');}
export function validateSuggestion(raw:any){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new FormError('Neplatný formulář.');
 if(raw.website)throw new FormError('Formulář se nepodařilo zpracovat.');
 const category=field(raw.category,30),title=field(raw.title,120),message=field(raw.message,4000,true),location=field(raw.location??'',180),contact_name=field(raw.contact_name??'',100),contact_email=field(raw.contact_email??'',254);
 if(!suggestionCategories.includes(category))throw new FormError('Vyberte téma podnětu.');
 if(title.length<5)throw new FormError('Název podnětu musí mít alespoň 5 znaků.');
 if(message.length<20)throw new FormError('Popište podnět alespoň 20 znaky.');
 if(contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))throw new FormError('Zkontrolujte e-mail pro odpověď.');
 return {category,title,message,location,contact_name,contact_email};
}
const enc=new TextEncoder();
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function un64(s:string){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('encoding');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
async function key(secret:string){if(!secret)throw Error('No form signing key');return await crypto.subtle.importKey('raw',enc.encode('obcane-suggestions-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function issueSuggestionToken(secret:string,origin:string,now=Date.now()){
 const payload=b64(enc.encode(JSON.stringify({origin,issued:now,nonce:crypto.randomUUID()}))),signature=await crypto.subtle.sign('HMAC',await key(secret),enc.encode(payload));return payload+'.'+b64(new Uint8Array(signature));
}
export async function verifySuggestionToken(secret:string,token:any,origin:string,now=Date.now()){
 try{if(typeof token!=='string'||token.length>800)return null;const [data,signature,...extra]=token.split('.');if(extra.length||!data||!signature||!await crypto.subtle.verify('HMAC',await key(secret),un64(signature),enc.encode(data)))return null;const p=JSON.parse(new TextDecoder().decode(un64(data)));if(p.origin!==origin||!uuid.test(p.nonce)||!Number.isInteger(p.issued)||now-p.issued<2000||now-p.issued>30*60*1000)return null;return p;}catch{return null;}
}
async function fingerprint(secret:string,value:string){return b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),enc.encode(value))));}
async function jsonBody(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new FormError('Neplatný formát požadavku.',415);
 if(Number(req.headers.get('content-length')||0)>16000)throw new FormError('Podnět je příliš dlouhý.',413);
 const reader=req.body?.getReader();if(!reader)throw new FormError('Chybí formulář.');const chunks:Uint8Array[]=[];let length=0;
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>16000){await reader.cancel();throw new FormError('Podnět je příliš dlouhý.',413);}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new FormError('Neplatný formulář.');}
}
export async function handleSuggestions(req:Request,{sql,response,secret,canManage}:any):Promise<Response|null>{
 const action=new URL(req.url).searchParams.get('suggestions');if(action===null)return null;
 try{
  if(action==='token'&&req.method==='GET'){
   const origin=req.headers.get('origin')||'';if(!suggestionOrigins.has(origin))throw new FormError('Formulář otevřete přímo na webu prortyni.cz.',403);
   return response({token:await issueSuggestionToken(secret,origin)});
  }
  if(action==='submit'&&req.method==='POST'){
   const origin=req.headers.get('origin')||'';if(!suggestionOrigins.has(origin))throw new FormError('Formulář otevřete přímo na webu prortyni.cz.',403);
   const raw=await jsonBody(req),data=validateSuggestion(raw),token=await verifySuggestionToken(secret,raw.token,origin);if(!token)throw new FormError('Platnost formuláře vypršela. Obnovte ověření a zkuste odeslání znovu.',403);
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown';
   const client=await fingerprint(secret,'client:'+ip),hash=await fingerprint(secret,'payload:'+JSON.stringify(data));
   const result=await sql.begin(async(tx:any)=>{
    await tx`select pg_advisory_xact_lock(82416026)`;
    const prior=await tx`select id,payload_hash from obcane.suggestions where request_key=${token.nonce}`;
    if(prior.length){if(prior[0].payload_hash!==hash)throw new FormError('Tento formulář už byl použit. Obnovte jej pro nový podnět.',409);return prior[0];}
    const counts=await tx`select count(*) filter(where client_hash=${client} and created_at>now()-interval '1 hour') as client_count,count(*) filter(where created_at>now()-interval '1 day') as total_count from obcane.suggestions where created_at>now()-interval '1 day'`;
    if(Number(counts[0].client_count)>=5||Number(counts[0].total_count)>=200)throw new FormError('Bylo odesláno více podnětů v krátké době. Zkuste to prosím později nebo nám napište e-mailem.',429);
    const rows=await tx`insert into obcane.suggestions(request_key,payload_hash,category,title,message,location,contact_name,contact_email,client_hash) values (${token.nonce},${hash},${data.category},${data.title},${data.message},${data.location},${data.contact_name},${data.contact_email},${client}) returning id`;return rows[0];
   });return response({ok:true,reference:String(result.id).slice(0,8).toUpperCase()},201);
  }
  if(action==='inbox'&&req.method==='GET'){
   if(!await canManage(req))throw new FormError('Přihlaste se účtem, který má přístup k podnětům.',401);
   const rows=await sql`select id,category,title,message,location,contact_name,contact_email,status,internal_note,created_at,updated_at from obcane.suggestions order by created_at desc limit 100`;return response({suggestions:rows});
  }
  if(action==='update'&&req.method==='POST'){
   if(!await canManage(req))throw new FormError('Nemáte přístup ke správě podnětů.',401);const raw=await jsonBody(req);if(!uuid.test(raw.id||'')||!['new','reviewing','done','closed'].includes(raw.status))throw new FormError('Neplatný stav podnětu.');const note=field(raw.internal_note??'',2000,true);const rows=await sql`update obcane.suggestions set status=${raw.status},internal_note=${note},updated_at=now() where id=${raw.id} returning id`;if(!rows.length)throw new FormError('Podnět nebyl nalezen.',404);return response({ok:true});
  }
  throw new FormError('Tento požadavek není podporován.',405);
 }catch(e){if(e instanceof FormError)return response({error:e.message},e.status);console.error('suggestion_request_failed');return response({error:'Podnět se nepodařilo uložit. Zkuste to prosím znovu; vyplněný text zůstává ve formuláři.'},500);}
}
