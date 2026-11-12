import postgres from 'npm:postgres@3.4.7';
import {cleanBatch} from './rules.mjs';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:15,connect_timeout:10});
const allowed=new Set(['https://prortyni.cz','https://www.prortyni.cz']);
const headers=(origin:string)=>({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type','Cache-Control':'no-store','Vary':'Origin'});
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';if(!allowed.has(origin))return new Response(null,{status:403});
 if(req.method==='OPTIONS')return new Response(null,{headers:headers(origin)});
 if(req.method!=='POST')return new Response(null,{status:405,headers:headers(origin)});
 try{
  if(/bot|crawler|spider|headless|lighthouse|preview|facebookexternalhit/i.test(req.headers.get('user-agent')||''))return new Response(null,{status:204,headers:headers(origin)});
  if(Number(req.headers.get('content-length')||0)>8000)throw Error('size');const reader=req.body?.getReader();if(!reader)throw Error('body');let bytes=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8000){await reader.cancel();throw Error('size');}parts.push(value);}const input=new Uint8Array(bytes);let offset=0;for(const part of parts){input.set(part,offset);offset+=part.length;}
  const body=cleanBatch(JSON.parse(new TextDecoder().decode(input)));
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(new Date().toISOString().slice(0,13)+'|'+ip));const rate=Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
  await sql.begin(async(tx)=>{
   const quota=await tx`insert into obcane.analytics_rate(bucket,hits) values(${rate},1) on conflict(bucket) do update set hits=obcane.analytics_rate.hits+1 where obcane.analytics_rate.hits<180 returning hits`;
   if(!quota.length)return;
   await tx`select pg_advisory_xact_lock(hashtext(${body.page}))`;
   const page=await tx`insert into obcane.analytics_pages(page_id,route,device,source) values(${body.page},${body.route},${body.device},${body.source}) on conflict(page_id) do update set page_id=excluded.page_id returning route,device,source,created_at`;
   if(page[0].route!==body.route||new Date(page[0].created_at).getTime()<Date.now()-86400000)return;
   const day=await tx`select (now() at time zone 'Europe/Prague')::date::text as reporting_day`;
   for(const e of body.events){const inserted=await tx`insert into obcane.analytics_seen(page_id,event,target) values(${body.page},${e.event},${e.target}) on conflict do nothing returning page_id`;if(!inserted.length)continue;
    await tx`insert into obcane.analytics_daily(day,event,target,route,device,source,n) values(${day[0].reporting_day},${e.event},${e.target},${body.route},${page[0].device},${page[0].source},1) on conflict(day,event,target,route,device,source) do update set n=obcane.analytics_daily.n+1`;
   }
  });return new Response(null,{status:204,headers:headers(origin)});
 }catch(e){console.error('obcane-analytics',String((e as any).code||((e as Error).message==='Neplatná data.'?'invalid_input':'collector_failure')));return new Response(null,{status:400,headers:headers(origin)});}
});
