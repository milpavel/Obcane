import {suggestionReplies} from './suggestion-replies.ts';
import {mailSettings,configureMail,dispatchMail} from './mail.ts';
import postgres from 'npm:postgres@3.4.7';
import {parseHTML} from 'npm:linkedom@0.18.12';
import {categories,kinds,FormError,validId,validateAd,decodePhotos,hash,sign,equalHash,issueToken,verifyToken,publicAd,readJSON} from './rules.mjs';
import {collectMunicipal} from './municipal.mjs';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:15,connect_timeout:10});
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const base=Deno.env.get('SUPABASE_URL')!;
const origins=new Set(['https://prortyni.cz','https://www.prortyni.cz','https://obcane-pro-rtyni.pages.dev']);
const bucket='obcane-classifieds';
const storageHeaders={Authorization:'Bearer '+secret,apikey:secret};
async function manager(req:Request){const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return false;const r=await fetch(base+'/auth/v1/user',{headers:{Authorization:token,apikey:Deno.env.get('SUPABASE_ANON_KEY')!},signal:AbortSignal.timeout(10000)});if(!r.ok)return false;const user=await r.json();if(!validId(user.id))return false;return (await sql`select 1 from obcane.suggestion_managers where user_id=${user.id} union all select 1 from public.obcane_editors where user_id=${user.id} limit 1`).length>0?{id:user.id}:false;}
async function owner(raw:any){if(!validId(raw.id)||typeof raw.key!=='string'||raw.key.length>100)throw new FormError('Odkaz pro správu je neplatný.',403);const rows=await sql`select * from obcane.classifieds where id=${raw.id} and origin='private'`;if(!rows.length||!await equalHash(rows[0].manage_hash,await hash(raw.key)))throw new FormError('Odkaz pro správu je neplatný.',403);return rows[0];}
async function uploadPhotos(id:string,images:Uint8Array[]){const paths=[];try{for(const bytes of images){const path=id+'/'+crypto.randomUUID()+'.jpg';const r=await fetch(base+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{...storageHeaders,'Content-Type':'image/jpeg'},body:bytes,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('photo upload failed');paths.push(path);}return paths;}catch(e){await removePhotos(paths);throw e;}}
async function removePhotos(paths:string[]){if(!paths.length)return;try{await fetch(base+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{...storageHeaders,'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths}),signal:AbortSignal.timeout(10000)});}catch{}}
async function save(tx:any,data:any,images:string[],where:string){return tx`update obcane.classifieds set category=${data.category},kind=${data.kind},title=${data.title},description=${data.description},location=${data.location},contact_name=${data.contact_name},contact_email=${data.contact_email},contact_phone=${data.contact_phone},price_mode=${data.price_mode},price=${data.price},price_note=${data.price_note},housing_type=${data.housing_type},disposition=${data.disposition},area=${data.area},available_from=${data.available_from},images=${tx.json(images)},status='published',moderation_note='',completion_state=null,updated_at=now(),published_at=now(),expires_at=now()+interval '30 days' where id=${where} and not moderation_locked returning id`;}
async function purgeOld(){
 await sql.begin(async(tx:any)=>{
 const rows=await tx`select id,images from obcane.classifieds where origin='private' and status<>'published' and updated_at<now()-interval '90 days' limit 5 for update skip locked`;
 for(const row of rows){if(row.images.length){const r=await fetch(base+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{...storageHeaders,'Content-Type':'application/json'},body:JSON.stringify({prefixes:row.images}),signal:AbortSignal.timeout(10000)});if(!r.ok)continue;}await tx`delete from obcane.classifieds where id=${row.id}`;}
 });
}
async function syncMunicipal(){
 await purgeOld();
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});
 const result=await collectMunicipal({today,parseHTML,page:async(url:string)=>{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('official source unavailable');const text=await r.text();if(text.length>1500000)throw Error('source too large');return text;}});
 await sql.begin(async(tx:any)=>{for(const o of result.offers){await tx`insert into obcane.classifieds(request_key,payload_hash,manage_hash,client_hash,category,kind,title,description,location,contact_name,contact_email,price_mode,housing_type,origin,source_url,deadline,status,published_at,expires_at) values(${crypto.randomUUID()},'municipal','disabled','municipal','bydleni','nabizim',${o.title},${o.description},'Rtyně v Podkrkonoší','Správa nemovitostí města','sbf@mestortyne.cz','dohodou','pronajem','municipal',${o.source_url},${o.deadline},'published',now(),${o.expires_at}::timestamptz) on conflict(source_url) do update set title=excluded.title,description=excluded.description,deadline=excluded.deadline,expires_at=excluded.expires_at,updated_at=now() where obcane.classifieds.status not in ('rejected','withdrawn')`;}
 await tx`update obcane.classifieds_sources set checked_at=now(),last_success_at=now(),status='ok',message=${result.unverified.length?'Některá oznámení nemají čitelnou uzávěrku; ověřte je přímo u města.':''} where key='municipal'`;});return {offers:result.offers.length,unverified:result.unverified};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';const cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://prortyni.cz','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
 const response=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 const url=new URL(req.url),action=url.searchParams.get('action')||'list';
 try{
 if(req.method==='POST'&&action==='sync'){
  const provided=req.headers.get('x-market-sync')||'';const rows=await sql`select decrypted_secret as value from vault.decrypted_secrets where name='obcane_classifieds_sync'`;
  if(!rows.length||!await equalHash(provided,rows[0].value))throw new FormError('Neoprávněný požadavek.',401);
  try{return response({ok:true,...await syncMunicipal()});}catch{await sql`update obcane.classifieds_sources set checked_at=now(),status='error',message='Zdroj města se nepodařilo celý ověřit. Nabídky ani kontakty nesmazány.' where key='municipal'`;return response({error:'Zdroj města se nepodařilo ověřit.'},502);}
 }
 if(req.method==='POST'&&action==='dispatch-mail')return response(await dispatchMail(req,sql,secret));
 if(['suggestion-replies','suggestion-reply','suggestion-reply-retry','suggestion-forward'].includes(action)){const actor=await manager(req);if(!actor)throw new FormError('Přihlaste se do redakce.',401);return response(await suggestionReplies(req,sql,actor,action));}
 if(['mail-settings','mail-configure','mail-retry','mail-pause','mail-management'].includes(action)){if(!await manager(req))throw new FormError('Přihlaste se do redakce.',401);if(req.method==='POST'&&action==='mail-management'){const raw=await readJSON(req);if(!validId(raw.id))throw new FormError('Neplatný inzerát.');const inserted=await sql`insert into obcane.market_mail_outbox(ad_id,event,version,recipient,snapshot) select id,'management',mail_version,contact_email,jsonb_build_object('title',title,'note',moderation_note,'expires_at',expires_at,'kind',kind) from obcane.classifieds where id=${raw.id} and origin='private' on conflict do nothing returning id`;return response({ok:true,queued:inserted.length>0});}if(req.method==='GET'&&action==='mail-settings')return response(await mailSettings(sql));if(req.method==='POST'&&action==='mail-configure')return response(await configureMail(req,sql));if(req.method==='POST'&&action==='mail-pause'){await sql`update obcane.market_mail_settings set enabled=false where id=true`;return response({ok:true});}if(req.method==='POST'&&action==='mail-retry'){await sql`update obcane.market_mail_outbox set status='queued',attempts=0,retry_at=now(),last_error=null where status='failed'`;return response({ok:true});}throw new FormError('Neplatný požadavek.',405);}
 if(req.method==='GET'&&action==='list'){
  const category=url.searchParams.get('category')||'',kind=url.searchParams.get('kind')||'',housing=url.searchParams.get('housing_type')||'',source=url.searchParams.get('source')||'',q=(url.searchParams.get('q')||'').slice(0,100),offset=Number(url.searchParams.get('offset')||0);
  if(category&&!Object.hasOwn(categories,category)||kind&&!Object.hasOwn(kinds,kind)||!Number.isInteger(offset)||offset<0||offset>10000)throw new FormError('Neplatný filtr.');
  const rows=await sql`select id,category,kind,title,left(description,220) as description,location,price_mode,price,price_note,housing_type,disposition,area,available_from,images,published_at,expires_at,origin,source_url,deadline from obcane.classifieds where status='published' and expires_at>now() and (${category}='' or category=${category}) and (${kind}='' or kind=${kind}) and (${housing}='' or housing_type=${housing}) and (${source}='' or origin=${source}) and (${q}='' or title ilike ${'%'+q+'%'} or description ilike ${'%'+q+'%'}) order by published_at desc,id desc limit 7 offset ${offset}`;
  const state=await sql`select checked_at,last_success_at,status,message from obcane.classifieds_sources where key='municipal'`;
  return response({items:rows.slice(0,6),has_more:rows.length>6,municipal:state[0]||null});
 }
 if(req.method==='GET'&&action==='search-index'){
 const rows=await sql`select id,title,description,category,kind,location from obcane.classifieds where status='published' and expires_at>now() order by published_at desc limit 500`;
 return response({items:rows});
 }
 if(req.method==='GET'&&action==='detail'){
  const id=url.searchParams.get('id');if(!validId(id))throw new FormError('Inzerát nebyl nalezen.',404);
  const rows=await sql`select * from obcane.classifieds where id=${id} and status='published' and expires_at>now()`;if(!rows.length)throw new FormError('Inzerát už není dostupný.',404);return response({item:publicAd(rows[0])});
 }
 if(req.method==='GET'&&action==='image'){
  const id=url.searchParams.get('id'),index=Number(url.searchParams.get('n'));if(!validId(id)||!Number.isInteger(index)||index<0||index>2)throw new FormError('Fotografie nebyla nalezena.',404);
  const rows=await sql`select images from obcane.classifieds where id=${id} and status='published' and expires_at>now()`;if(!rows.length||!rows[0].images[index])throw new FormError('Fotografie není dostupná.',404);
  const r=await fetch(base+'/storage/v1/object/authenticated/'+bucket+'/'+rows[0].images[index],{headers:storageHeaders,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new FormError('Fotografie není dostupná.',404);return new Response(r.body,{headers:{...cors,'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
 }
 if(req.method==='GET'&&action==='token'){if(!origins.has(origin))throw new FormError('Formulář otevřete na prortyni.cz.',403);return response({token:await issueToken(secret,origin)});}
 if(req.method==='GET'&&action==='admin'){if(!await manager(req))throw new FormError('Přihlaste se do správy portálu.',401);const rows=await sql`select id,category,kind,title,description,location,contact_name,contact_email,contact_phone,price_mode,price,price_note,housing_type,disposition,area,available_from,images,origin,source_url,deadline,status,completion_state,moderation_note,moderation_locked,created_at,published_at,expires_at from obcane.classifieds order by created_at desc limit 200`;return response({items:rows});}
 if(req.method==='POST'&&['admin-photo','owner-photo'].includes(action)){if(action==='admin-photo'&&!await manager(req))throw new FormError('Přihlaste se do správy portálu.',401);const raw=await readJSON(req);if(action==='owner-photo')await owner(raw);if(!validId(raw.id)||!Number.isInteger(raw.index)||raw.index<0||raw.index>2)throw new FormError('Neplatná fotografie.');const rows=await sql`select images from obcane.classifieds where id=${raw.id}`;const path=rows[0]?.images[raw.index];if(!path)throw new FormError('Fotografie nebyla nalezena.',404);const r=await fetch(base+'/storage/v1/object/authenticated/'+bucket+'/'+path,{headers:storageHeaders});if(!r.ok)throw new FormError('Fotografie nebyla nalezena.',404);return new Response(r.body,{headers:{...cors,'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 if(req.method==='POST'&&action==='moderate'){
  if(!await manager(req))throw new FormError('Nemáte oprávnění ke správě inzerce.',401);const raw=await readJSON(req);if(!validId(raw.id)||!['published','rejected','withdrawn'].includes(raw.status)||typeof raw.note!=='string'||raw.note.length>1000)throw new FormError('Neplatná změna stavu.');
  const rows=await sql`update obcane.classifieds set status=${raw.status},moderation_locked=${raw.status!=='published'},completion_state=null,moderation_note=${raw.note},published_at=case when ${raw.status}='published' then now() else published_at end,expires_at=case when ${raw.status}='published' then case when origin='municipal' then expires_at else now()+interval '30 days' end else expires_at end,updated_at=now() where id=${raw.id} and (status<>${raw.status} or moderation_note<>${raw.note}) returning id`;
  if(!rows.length&&(await sql`select 1 from obcane.classifieds where id=${raw.id}`).length)return response({ok:true});
  if(!rows.length)throw new FormError('Inzerát nebyl nalezen.',404);return response({ok:true});
 }
 if(req.method==='POST'&&action==='owner') {const raw=await readJSON(req),ad=await owner(raw);return response({item:{...publicAd(ad),status:ad.completion_state==='sold'?'sold':ad.status,moderation_note:ad.moderation_note,moderation_locked:ad.moderation_locked}});}
 if(req.method==='POST'&&action==='withdraw'){const raw=await readJSON(req);await owner(raw);const completion=raw.status==='sold'?'sold':'inactive';await sql`update obcane.classifieds set status='withdrawn',completion_state=${completion},updated_at=now() where id=${raw.id} and (status<>'withdrawn' or completion_state is distinct from ${completion})`;return response({ok:true});}
 if(req.method==='POST'&&['submit','edit'].includes(action)){
  if(!origins.has(origin))throw new FormError('Formulář otevřete na prortyni.cz.',403);const raw=await readJSON(req),data=validateAd(raw),photos=decodePhotos(raw.photos||[]);
  const token=await verifyToken(secret,raw.token,origin);if(!token)throw new FormError('Ověření formuláře vypršelo. Obnovte ověření a zkuste to znovu.',403);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown',client=await sign(secret,'client:'+ip);
  if(action==='edit'){
   const ad=await owner(raw);if(Date.now()-new Date(ad.updated_at).getTime()<15000)throw new FormError('Další úpravu můžete uložit za několik sekund.',429);if(ad.moderation_locked||ad.status==='rejected')throw new FormError('Inzerát stáhla redakce. Pro obnovení kontaktujte redakci.',403);
   const paths=raw.replace_photos===true?await uploadPhotos(ad.id,photos):ad.images;
   try{await sql.begin(async(tx:any)=>{await tx`select pg_advisory_xact_lock(82416028)`;const counts=await tx`select count(*) from obcane.classifieds where client_hash=${client} and updated_at>now()-interval '1 minute'`;if(Number(counts[0].count)>=5)throw new FormError('Zkuste to prosím za chvíli.',429);const saved=await save(tx,data,paths,ad.id);if(!saved.length)throw new FormError('Inzerát už není dostupný.',404);});}catch(e){if(raw.replace_photos===true)await removePhotos(paths);throw e;}
   if(raw.replace_photos===true)await removePhotos(ad.images);return response({ok:true,id:ad.id});
  }
  const management=await sign(secret,'manage:'+token.nonce),payloadHash=await hash(JSON.stringify(data)+'|'+JSON.stringify(raw.photos||[]));let uploaded:string[]=[];
  try{const row=await sql.begin(async(tx:any)=>{
   await tx`select pg_advisory_xact_lock(82416028)`;const prior=await tx`select id,payload_hash from obcane.classifieds where request_key=${token.nonce}`;if(prior.length){if(prior[0].payload_hash!==payloadHash)throw new FormError('Formulář už byl použit. Obnovte jej pro nový inzerát.',409);return prior[0];}
   const limits=await tx`select count(*) filter(where client_hash=${client} and created_at>now()-interval '1 hour') as client_count,count(*) as total from obcane.classifieds where created_at>now()-interval '1 day'`;if(Number(limits[0].client_count)>=3||Number(limits[0].total)>=100)throw new FormError('Bylo vloženo více inzerátů v krátké době. Zkuste to později.',429);
   const id=crypto.randomUUID();uploaded=await uploadPhotos(id,photos);
   await tx`insert into obcane.classifieds(id,request_key,payload_hash,manage_hash,client_hash,category,kind,title,description,location,contact_name,contact_email,contact_phone,price_mode,price,price_note,housing_type,disposition,area,available_from,images,status,published_at,expires_at) values(${id},${token.nonce},${payloadHash},${await hash(management)},${client},${data.category},${data.kind},${data.title},${data.description},${data.location},${data.contact_name},${data.contact_email},${data.contact_phone},${data.price_mode},${data.price},${data.price_note},${data.housing_type},${data.disposition},${data.area},${data.available_from},${tx.json(uploaded)},'published',now(),now()+interval '30 days')`;return {id};
  });return response({ok:true,id:row.id,manage_key:management},201);}catch(e){await removePhotos(uploaded);throw e;}
 }
 throw new FormError('Tento požadavek není podporován.',405);
 }catch(e){if(e instanceof FormError)return response({error:e.message},e.status);console.error('market_request_failed');return response({error:'Požadavek se nepodařilo dokončit. Vyplněný text zůstává ve formuláři.'},500);}
});
