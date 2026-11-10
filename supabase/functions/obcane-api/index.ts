import {handleSuggestions} from './suggestions.ts';
import {communitySources} from './community-sources.ts';
import {dailyInfo} from './daily.ts';
import {transportInfo} from './transport.mjs';
import {municipalPDF,validDocumentId} from './documents.mjs';
import postgres from 'npm:postgres@3.4.7';
import { extraSources, extractExtra, assets, contentBlocks, cleanContent } from './extra-sources.ts';
import { parseHTML } from 'npm:linkedom@0.18.12';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, {max: 1, prepare: false, idle_timeout: 15, connect_timeout: 10});
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-import-token','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const sources = [
 {key:'city',name:'Město Rtyně',url:'https://www.rtyne.cz/',category:'Město'},
 {key:'school',name:'ZŠ a ZUŠ Rtyně',url:'https://www.zsrtyne.cz/pro-verejnost/aktuality',category:'Škola'},
 {key:'preschool',name:'MŠ Rtyně',url:'https://www.msrtyne.cz/aktuality/',category:'Školka'},
 {key:'water',name:'VAK Rtyně',url:'https://www.vakrtyne.cz/havarie-a-odstavky',category:'Voda'},
 ...extraSources,
];
const clean = (s:any) => String(s || '').replace(/\s+/g,' ').trim();
const text = (el:any) => clean(el?.textContent);
const response = (value:any,status=200) => new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
function safeURL(href:string,base:string) { const u=new URL(href,base), b=new URL(base); if((u.protocol!=='https:'&&!(u.protocol==='http:'&&b.protocol==='http:'&&b.hostname==='www.banikrtyne-fotbal.cz'))||u.hostname!==b.hostname||u.username||u.password)throw Error('Nepovolený odkaz zdroje');return u.href; }
async function page(url:string,base=url) {
 safeURL(url,base);
 for(let n=0;n<3;n++){
  try { const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'ObcaneProRtyni/2.0 (+https://obcane-pro-rtyni.pages.dev)'}});
   if(r.status>=300&&r.status<400){const next=safeURL(r.headers.get('location')||'',base);if(next===url)throw Error('Smyčka přesměrování');url=next;continue;}
   if(r.status===429&&n<2){await new Promise(resolve=>setTimeout(resolve,Math.min(5000,Number(r.headers.get('retry-after')||2)*1000)));continue;}
   if(!r.ok)throw Error('HTTP '+r.status);
   const raw=await r.text();if(raw.length>2_000_000)throw Error('Stránka je příliš velká');
   const {document}=parseHTML(raw);document.querySelectorAll('script,style,nav:not(.tiles),footer,form,.share-container').forEach((x:any)=>x.remove());document.querySelectorAll('br').forEach((x:any)=>x.replaceWith(document.createTextNode(' ')));return document;
  }catch(e){if(n===2)throw e;}
 } throw Error('Příliš mnoho přesměrování');
}
function czDate(value:string):string|null {
 const m=value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/);if(!m)return null;
 const iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const d=new Date(iso+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:null;
}
const months=['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
function eventDate(value:string) {
 const m=value.match(/(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\s+(20\d{2})/i);
 return m?czDate(`${m[1]}.${months.indexOf(m[2].toLowerCase())+1}.${m[3]}`):czDate(value);
}
function paragraphs(root:any) {
 if(!root)return [];
 return Array.from(root.querySelectorAll('p,li')).map((n:any)=>cleanContent(text(n))).filter((s:any)=>s.length>4).filter((s:any,i:number,a:any[])=>a.indexOf(s)===i).slice(0,35);
}
async function extract(s:any) {
 const extra=await extractExtra(s,{page,text,clean,eventDate,czDate,safeURL});if(extra!==null)return extra;
 let doc:any;try{doc=await page(s.url);}catch(e){if(s.key!=='preschool')throw e;doc=await page('https://www.msrtyne.cz/');}let items:any[]=[];
 if(s.key==='preschool') {
  items=Array.from(doc.querySelectorAll('.news__item')).slice(0,8).map((card:any)=>{
   const p=paragraphs(card.querySelector('.perex'));const stamp=card.getAttribute('data-created')||'';
   const heading=Array.from(card.querySelectorAll('.perex strong')).map(text).find(x=>x.length>6&&!/^Vážení rodiče/i.test(x));
   const raw=heading||p.find(x=>x.length>12&&!/^Vážení rodiče/i.test(x))||p[0]||'Aktualita MŠ';const title=raw.length>110?raw.slice(0,105).replace(/\s+\S*$/,'')+'…':raw;
   return {detail_ok:true,title,url:s.url+'#zprava-'+stamp.replace(/\D/g,''),summary:p.join(' ').slice(0,500),body:p,published:stamp?stamp.replace(' ','T')+'+01:00':null};
  });
 } else {
  let cards:any= s.key==='city'?doc.querySelectorAll('article.card'):s.key==='school'?doc.querySelectorAll('article'):doc.querySelectorAll('a.titleLink');
  if(s.key==='city'){const news=await page('https://www.rtyne.cz/aktualni-informace');cards=[...Array.from(cards),...Array.from(news.querySelectorAll('article.document')).slice(0,10)];}
  const seen=new Set();for(const card of Array.from(cards).slice(0,s.key==='city'?30:8) as any[]) {
   const a=s.key==='water'?card:card.querySelector(s.key==='city'?'a.card__link,a.document__link':'.entry-title a');if(!a)continue;
   const title=text(a.querySelector('h3')||a);if(title.length<5)continue;const url=safeURL(a.getAttribute('href'),s.url);if(seen.has(url))continue;seen.add(url);
   const description=text(card.querySelector('.card__description,.document__description,.entry-summary'));
   const pub=card.querySelector('time[datetime]')?.getAttribute('datetime')||null;
   const event=s.key==='water'?czDate(title):s.key==='city'&&/přehled akcí/i.test(text(card))?eventDate(description):null;
   items.push({title,url,summary:description.replace(/» více$/,''),published:pub,event});
  }
  // Bounded detail requests: failures preserve the previously stored detail.
  const cached=await sql`select external_url,payload,last_seen_at,summary,published_at from obcane.items where source_key=${s.key}`;
  const queue=items.slice();
  async function details(){let item:any;while((item=queue.shift())){
   const prior=cached.find((x:any)=>x.external_url===item.url);
   if(prior?.payload?.detail_ok&&Array.isArray(prior.payload.blocks)&&!prior.payload.detail_error&&(s.key!=='water'||prior.published_at)&&Date.now()-Date.parse(prior.payload.detail_fetched_at||'')<12*3600*1000){item.body=prior.payload.body;item.days=prior.payload.days;item.published=prior.published_at||item.published;item.summary=item.summary||prior.summary||(item.body||[]).join(' ').slice(0,500);item.extra={blocks:prior.payload.blocks||null,images:prior.payload.images||[],attachments:prior.payload.attachments||[],restriction_date:prior.payload.restriction_date||null};item.detail_fetched_at=prior.payload.detail_fetched_at;item.detail_ok=true;continue;}
   await new Promise(resolve=>setTimeout(resolve,s.key==='city'?1500:300));
   try {
    const detail=await page(item.url,s.url);
    const root=detail.querySelector(s.key==='city'?'.article__text .text-component':s.key==='school'?'.entry-content':'.l-articleContent .cms');
    item.body=paragraphs(root);
    const perex=text(detail.querySelector('.article__perex,.perex'));
    if(perex)item.summary=perex.slice(0,500);
    if(!item.summary)item.summary=(item.body||[]).join(' ').slice(0,500);
    if(s.key==='water'){const pub=czDate(text(detail.querySelector('p.date')));if(pub)item.published=pub;}
    if(s.key==='school') {
     const date=detail.querySelector('time[datetime]')?.getAttribute('datetime');if(date)item.published=date;
     const days=Array.from(detail.querySelectorAll('.food-menu .day')).map((day:any)=>({date:czDate(text(day.querySelector('.date'))),soup:text(day.querySelector('.day-content p')).replace(/^polévka\s*/i,''),meals:Array.from(day.querySelectorAll('.day-content li')).map(text)})).filter((d:any)=>d.date&&d.meals.length);
     if(days.length)item.days=days;
    }
    item.extra={blocks:contentBlocks(root,item.url),...assets(detail.querySelector('article')||root,item.url),restriction_date:/odstáv|dodávk|uzav|fréz|asfalt|elektř|havár/i.test(item.title)?eventDate(item.title+' '+item.summary):null};
    item.detail_fetched_at=new Date().toISOString();item.detail_ok=!!item.body.length;
   }catch(e){item.detail_error=String(e).slice(0,160);}
  }}
  await Promise.all(Array.from({length:s.key==='city'?1:2},()=>details()));
 }
 if(!items.length)throw Error('Struktura zdroje se změnila: nenalezeny žádné zprávy');
 return items;
}
async function importSource(s:any){
 if(s.feed==='external'){await sql`insert into obcane.sources(source_key,source_url,status,checked_at) values(${s.key},${s.url},'pending',now()) on conflict(source_key) do update set source_url=excluded.source_url,status='pending',last_error=null,checked_at=now(),updated_at=now()`;return {key:s.key,status:'skipped',reason:'Externí stránka; automatický import není napojený'};}

 await sql`insert into obcane.sources (source_key,source_url,status) values (${s.key},${s.url},'pending') on conflict (source_key) do nothing`;
 try {
  const items=await extract(s);const checked=new Date().toISOString();const detailFailures=items.filter(x=>x.detail_error||x.extra?.service_child_errors?.length).length;
  await sql.begin(async(tx:any)=>{
   for(const item of items) {
    const payload={in_latest:true,...(s.community?{club_key:s.key,club_name:s.name}:{}),...(item.extra||{}),source_name:s.name,body:item.body||[],days:item.days||[],detail_ok:!!item.detail_ok,detail_fetched_at:item.detail_fetched_at||checked,detail_error:item.detail_error||null};
    await tx`insert into obcane.items (source_key,external_url,title,category,event_date,published_at,summary,payload,last_seen_at)
      values (${s.key},${item.url},${item.title},${s.category},${item.event||null},${item.published||null},${item.summary||''},${tx.json(payload)},${checked})
      on conflict (source_key,external_url) do update set title=excluded.title,category=excluded.category,event_date=excluded.event_date,
      published_at=coalesce(excluded.published_at,obcane.items.published_at),summary=excluded.summary,
      payload=case when excluded.payload->>'detail_error' is not null then obcane.items.payload || jsonb_build_object('detail_error',excluded.payload->>'detail_error') else excluded.payload end,last_seen_at=excluded.last_seen_at`;
   }
   if((['calendar','clubs','library','sms_areal','sms_orlovna'].includes(s.key)||s.community))await tx`update obcane.items set payload=payload || '{"in_latest":false}'::jsonb where source_key=${s.key} and last_seen_at < ${checked}::timestamptz`;
   await tx`update obcane.sources set checked_at=${checked},last_success_at=${checked},updated_at=${checked},status=${detailFailures?'error':'ok'},last_error=${detailFailures?'Nenačtené detaily: '+detailFailures:null},item_count=${items.length} where source_key=${s.key}`;
  });
  return {key:s.key,status:detailFailures?'partial':'ok',count:items.length,detail_failures:detailFailures};
 }catch(e){const error=String(e).slice(0,250);await sql`update obcane.sources set status='error',last_error=${error},checked_at=now(),updated_at=now() where source_key=${s.key}`;return {key:s.key,status:'error',error};}
}
async function isEditor(req:Request){
 const token=req.headers.get('authorization');if(!token)return false;
 const r=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:token,apikey:Deno.env.get('SUPABASE_ANON_KEY')!}});if(!r.ok)return false;
 const user=await r.json();if(!user.id)return false;const rows=await sql`select 1 from public.obcane_editors where user_id=${user.id}`;return rows.length>0;
}
async function canManageSuggestions(req:Request){
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return false;
 const r=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:token,apikey:Deno.env.get('SUPABASE_ANON_KEY')!},signal:AbortSignal.timeout(10000)});if(!r.ok)return false;const user=await r.json();if(!user.id)return false;
 const rows=await sql`select 1 from obcane.suggestion_managers where user_id=${user.id} union all select 1 from public.obcane_editors where user_id=${user.id} limit 1`;return rows.length>0;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try {
  const suggestionResult=await handleSuggestions(req,{sql,response,secret:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,canManage:canManageSuggestions});if(suggestionResult)return suggestionResult;
  if(req.method==='GET') {
   const documentId=new URL(req.url).searchParams.get('document');
   if(documentId!==null){
    if(!validDocumentId(documentId))return municipalPDF(documentId,false);
    const approved=await sql`select 1 from obcane.items where payload::text like ${'%"https://www.rtyne.cz/file/'+documentId+'"%'} limit 1`;
    return municipalPDF(documentId,approved.length>0);
   }
   if(new URL(req.url).searchParams.get('transport')==='1'){
    const result=await transportInfo(new URL(req.url).searchParams);
    return response(result,result.error?400:200);
   }
   if(new URL(req.url).searchParams.get('daily')==='1')return response(await dailyInfo());
   const id=new URL(req.url).searchParams.get('id');
   if(id&&!/^\d{1,16}$/.test(id))return response({error:'Neplatný identifikátor'},400);
   const items=id?await sql`select id,source_key,external_url,title,category,event_date::text,published_at,summary,payload,last_seen_at from obcane.items where id=${id} limit 1`:await sql`select id,source_key,external_url,title,category,event_date::text,published_at,summary,payload,last_seen_at from obcane.items order by coalesce(published_at,last_seen_at) desc,id desc limit 450`;
   const posts=await sql`select id,title,excerpt,body,category,source_url,published_at from public.obcane_posts where status='published' order by published_at desc limit 50`;
   const events=await sql`select id,title,starts_at,location,description,source_url from public.obcane_events where status='published' order by starts_at desc limit 30`;
   const finances=await sql`select id,year,title,amount_czk,kind,explanation,source_url from public.obcane_finances where status='published' order by year desc,id desc limit 30`;
   const state=await sql`select source_key,source_url,status,checked_at,last_success_at,last_error,item_count from obcane.sources order by source_key`;
   return response({items,posts,events,finances,sources:state.map((x:any)=>({...x,name:sources.find(s=>s.key===x.source_key)?.name,mode:sources.find(s=>s.key===x.source_key)?.feed==='external'?'external':'automatic',community:communitySources.some(s=>s.key===x.source_key),news_note:communitySources.find(s=>s.key===x.source_key)?.note||null})),generated_at:new Date().toISOString()});
  }
  if(req.method!=='POST')return response({error:'Metoda není podporována'},405);
  const token=req.headers.get('x-import-token')||'';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const access=token?await sql`select 1 from obcane.import_control where id=true and token_hash=${hash}`:[];
  if(!access.length&&!await isEditor(req))return response({error:'Přihlášení editora je vyžadováno'},401);
  const lock=await sql`update obcane.import_control set lease_until=now()+interval '4 minutes' where id=true and (lease_until is null or lease_until<now()) returning id`;
  if(!lock.length)return response({error:'Import již běží'},409);
  try {const results=await Promise.all(sources.filter(s=>!extraSources.some(x=>x.key===s.key)).map(importSource));const official=async()=>{const out=[];for(const s of extraSources.filter(s=>['calendar','clubs','services'].includes(s.key)))out.push(await importSource(s));return out;};const extra=await Promise.all([official(),...extraSources.filter(s=>!['calendar','clubs','services'].includes(s.key)).map(async s=>[await importSource(s)])]);results.push(...extra.flat());return response({ok:results.every(x=>['ok','skipped'].includes(x.status)),results});}
  finally {await sql`update obcane.import_control set lease_until=null where id=true`;}
 }catch(e){console.error('obcane-api',String(e));return response({error:'Data se nepodařilo zpracovat. Zkuste to později.'},500);}
});
