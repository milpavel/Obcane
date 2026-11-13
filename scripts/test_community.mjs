// Runs the real Edge handler against a private in-memory PostgreSQL instance.
// Authentication is stubbed here; no production users or content are created.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
import * as rules from '../supabase/functions/obcane-community/rules.mjs';
const pg=new PGlite();
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create schema obcane;create table public.obcane_editors(user_id uuid primary key references auth.users(id));create table public.obcane_posts(id bigint primary key,title text,slug text,status text,published_at timestamptz);create table public.obcane_events(id bigint primary key,title text,status text);create table obcane.items(id bigint primary key,title text,payload jsonb);create table obcane.content_overrides(target text primary key,data jsonb,active boolean);insert into auth.users values('${ids.join("'),('")}');insert into public.obcane_editors values('${ids[2]}');insert into public.obcane_posts values(1,'Veřejný článek','verejny','published',now()-interval '1 day'),(2,'Tajný koncept','koncept','draft',now()),(3,'Naplánovaný','plan','scheduled',now()+interval '1 day');insert into obcane.items values(1,'Spolek','{"kind":"club"}'),(2,'Lékař','{"kind":"service"}');`);
await pg.exec(await readFile(new URL('../supabase/schema-community.sql',import.meta.url),'utf8'));
function fragment(strings,values){return {fragment:true,strings,values};}
function build(f,params=[]){let out=f.strings[0];for(let i=0;i<f.values.length;i++){const v=f.values[i];if(v?.fragment)out+=build(v,params);else if(v?.list)out+='('+v.list.map(x=>{params.push(x);return '$'+params.length;}).join(',')+')';else{if(v===undefined)throw Error('Undefined SQL parameter');params.push(v instanceof Date?v.toISOString():v);out+='$'+params.length;}out+=f.strings[i+1];}return out;}
function tag(strings,...values){if(!Array.isArray(strings.raw))return {list:strings};const f=fragment(strings,values);const params=[],query=build(f,params);const promise=pg.query(query,params).then(r=>r.rows);promise.fragment=true;promise.strings=strings;promise.values=values;return promise;}
// postgres.js nested SQL fragments are lazy. Build without executing when interpolated.
function sql(strings,...values){if(!strings.raw)return {list:strings};const f=fragment(strings,values);return {...f,then(ok,bad){const params=[],query=build(f,params);return pg.query(query,params).then(r=>r.rows).then(ok,bad);}};}
sql.begin=async fn=>{await pg.exec('begin');try{const out=await fn(sql);await pg.exec('commit');return out;}catch(e){await pg.exec('rollback');throw e;}};
let handler;const Deno={env:{get:k=>k==='SUPABASE_URL'?'https://auth.test':'unused'},serve:fn=>handler=fn};
const users={a:{id:ids[0],email_confirmed_at:'2026-01-01'},b:{id:ids[1],email_confirmed_at:'2026-01-01'},editor:{id:ids[2],email_confirmed_at:'2026-01-01'},unconfirmed:{id:ids[0]},anon:{id:ids[0],email_confirmed_at:'2026-01-01',is_anonymous:true}};
const fetch=async(_url,opts)=>{const token=opts.headers.Authorization.slice(7);return Response.json(users[token]||{},{status:users[token]?200:401});};
let source=stripTypeScriptTypes(await readFile(new URL('../supabase/functions/obcane-community/index.ts',import.meta.url),'utf8'));
source=source.replace(/^import postgres.*;\n/,'const postgres=()=>sqlShim;\n').replace(/^import \{[^\n]+\} from '\.\/rules.mjs';/m,'const {InputError,uuid,id,text,source,category,reaction,content,displayName,offset,readBody}=rules;');
new Function('sqlShim','rules','Deno','fetch',source)(sql,rules,Deno,fetch);
const call=async(action,body,token,expected=200)=>{const req=new Request('https://test.invalid?'+(typeof action==='string'?'action='+action:new URLSearchParams(action)),{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const r=await handler(req),data=await r.json();assert.equal(r.status,expected,JSON.stringify({action,data}));return data;};
assert.equal((await call('feed')).topics.length,0);
for(const key of ['post:2','post:3','item:2','post:999'])await call({action:'thread',key},null,null,404);
await call('me',null,null,401);await call('admin',null,'a',403);await call('me',null,'unconfirmed',403);await call('me',null,'anon',403);await call('comment',{key:'post:1',body:'Názor',client_id:crypto.randomUUID()},null,401);
for(const token of ['a','b','editor'])await call('profile',{name:token==='editor'?'Redakce':'Soused '+token,notify_replies:true},token);
await call('profile',{name:'Redakce Pro Rtyni',notify_replies:true},'a',400);
await call('topic-reaction',{key:'post:1',kind:'heart',active:true},'b');await call('topic-reaction',{key:'post:1',kind:'heart',active:true},'b');assert.equal((await call({action:'thread',key:'post:1'},null,'b')).reactions.hearts,1);await call('topic-reaction',{key:'post:1',kind:'heart',active:false},'b');assert.equal((await call({action:'thread',key:'post:1'})).reactions.hearts,0);
const first=await call('comment',{key:'post:1',body:'První názor souseda',client_id:crypto.randomUUID()},'a');assert.equal(first.pending,true);
assert.equal((await call({action:'thread',key:'post:1'})).comments.length,0);
assert.equal((await call({action:'thread',key:'post:1'},null,'a')).comments[0].body,'První názor souseda');
await call('moderate',{id:first.id,mode:'approve'},'a',403);
await call('moderate',{id:first.id,mode:'approve'},'editor');
let d=await call({action:'thread',key:'post:1'},null,'b');assert.equal(d.comments.length,1);assert.equal(d.comments[0].editor,false);assert.ok(!('email'in d.comments[0]));assert.ok(!('author_id'in d.topic));
let payload={key:'post:1',body:'Další názor stejného souseda',client_id:crypto.randomUUID()};const trusted=await call('comment',payload,'a');assert.equal(trusted.pending,false);assert.equal((await call('comment',payload,'a')).id,trusted.id);
for(let i=0;i<2;i++)await call('reaction',{id:first.id,kind:'heart',active:true},'b');
d=await call({action:'thread',key:'post:1'},null,'b');assert.equal(d.comments[0].hearts,1);assert.equal(d.comments[0].hearted,true);
const reply=await call('comment',{key:'post:1',parent_id:first.id,body:'Odpověď redakce',client_id:crypto.randomUUID()},'editor');assert.equal(reply.pending,false);
d=await call('notifications',null,'a');assert.ok(d.notifications.some(n=>n.comment_id===reply.id&&n.kind==='reply'));
await call('read',{id:d.notifications[0].id},'b');assert.equal((await call('notifications',null,'a')).notifications[0].read_at,null);
await call('report',{id:trusted.id,reason:'Zkontrolujte prosím obsah.'},'b');assert.equal((await call({action:'admin',filter:'reports'},null,'editor')).comments[0].id,trusted.id);
await call('moderate',{id:trusted.id,mode:'hide',reason:'Test moderace'},'editor');d=await call({action:'thread',key:'post:1'});assert.equal(d.comments.find(c=>c.id===trusted.id).body,'');
await call('moderate',{id:first.id,mode:'block',reason:'Test pozastavení'},'editor');await call('comment',{key:'post:1',body:'Nemá projít',client_id:crypto.randomUUID()},'a',403);await call('moderate',{id:first.id,mode:'unblock'},'editor');
await call('topic-settings',{key:'post:1',locked:true},'editor');await call('comment',{key:'post:1',body:'Nemá projít',client_id:crypto.randomUUID()},'a',403);await call('topic-settings',{key:'post:1',locked:false},'editor');
const own=await call('new-topic',{title:'Pomoc se zahradou',body:'Může mi někdo poradit?',category:'help',client_id:crypto.randomUUID()},'b');assert.equal(own.pending,true);assert.ok(!(await call('feed')).topics.some(t=>t.source_key===own.key));await call('moderate',{id:own.id,mode:'approve'},'editor');assert.ok((await call('feed')).topics.some(t=>t.source_key===own.key));
await call('topic-settings',{key:own.key,resolved:true},'a',403);await call('topic-settings',{key:own.key,resolved:true},'b');assert.equal((await call({action:'thread',key:own.key})).topic.resolved,true);
await call('comment',{key:'post:1',parent_id:own.id,body:'Cizí vlákno',client_id:crypto.randomUUID()},'editor',400);
await call('delete',{id:first.id},'b',403);await call('delete',{id:first.id},'a');assert.equal((await call({action:'thread',key:'post:1'})).comments.find(c=>c.id===first.id).body,'');
await pg.exec("update public.obcane_posts set status='draft' where id=1");assert.ok(!(await call('feed')).topics.some(t=>t.source_key==='post:1'));assert.ok(!(await call('notifications',null,'a')).notifications.some(n=>n.source_key==='post:1'));await call({action:'thread',key:'post:1'},null,null,404);
await pg.exec('set role anon');await assert.rejects(()=>pg.query('select * from community.profiles'),/permission denied/);await pg.exec('reset role');
await call('reaction',{id:own.id,kind:'angry',active:true},'a',400);
await call('comment',{key:own.key,body:'x'.repeat(3001),client_id:crypto.randomUUID()},'a',400);
await pg.exec(`insert into community.comments(topic_id,author_id,body,status,client_id) select t.id,'${ids[1]}'::uuid,'Příspěvek '||n,'approved',gen_random_uuid() from community.topics t cross join generate_series(1,35) n where t.source_key='${own.key}';delete from community.rate_limits;`);const page=await call({action:'thread',key:own.key});assert.equal(page.comments.length,30);assert.equal(page.more,true);const next=await call({action:'thread',key:own.key,after:page.comments.at(-1).id});assert.equal(page.comments.length+next.comments.length,36);assert.equal(new Set([...page.comments,...next.comments].map(c=>c.id)).size,36);for(let i=0;i<30;i++)await call('read',{},'a');await call('read',{},'a',429);
await pg.close();console.log('PASS: real PostgreSQL handler tests — private drafts, verified accounts, role separation, first-post review, trust, idempotency, hearts, replies, private notifications, reports, moderation, block/unblock, lock, neighbor topics, resolution, ownership, cross-thread rejection, source withdrawal and denied browser table access');
