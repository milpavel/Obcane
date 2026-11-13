import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {detailMeta} from '../assets/detail-meta.js';
import {qualityIssues} from '../assets/source-quality.js';
import {streamFeed} from '../assets/feed-client.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const oldDoc=globalThis.document,oldLoc=globalThis.location;
globalThis.document=new EventTarget();globalThis.location={pathname:'/'};
const remote=deferred(),changes=[],feed={items:[{id:1,title:'Stored',payload:{}}],sources:[]};
const stream=streamFeed((d,s)=>changes.push({d,s}),{fetchJSON:url=>url.includes('supabase')?remote.promise:Promise.resolve(feed),getConfig:()=>Promise.resolve({overrides:[],sections:[]})});
await stream.ready;assert.equal(changes[0].d.items[0].title,'Stored');assert.equal(changes[0].s.live,false,'Do not wait for unavailable live API');
remote.resolve({items:[],sources:[]});await stream.settled;assert.equal(changes.at(-1).d.items.length,0,'A successful empty live response removes withdrawn records');assert.equal(changes.at(-1).s.live,true);stream.close();
const failure=[];const failed=streamFeed((d,s)=>failure.push({d,s}),{fetchJSON:()=>Promise.reject(Error('offline')),getConfig:()=>Promise.resolve({overrides:[],sections:[]})});await failed.settled;assert.equal(failure.at(-1).s.error,true);failed.close();

let practicalRequests=0,posterRequests=0;
const shared=streamFeed(()=>{},{fetchJSON:()=>Promise.resolve(feed),getConfig:()=>Promise.resolve({overrides:[],sections:[]}),getPractical:async()=>{practicalRequests++;return {items:[]};},getPosters:async()=>{posterRequests++;return {items:[]};}});
await shared.ready;await Promise.all([shared.enrich(),shared.enrich(),shared.enrich()]);assert.equal(practicalRequests,1);assert.equal(posterRequests,1);shared.close();
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),{document:d}=parseHTML(html);
assert.equal(d.querySelector('#doprava').tagName,'A');assert.equal(d.querySelector('#servis').tagName,'A');assert.equal(d.querySelector('#aktuality-lekaru'),null);
assert.ok([...d.querySelectorAll('#home>section')].findIndex(x=>x.id==='hlavni-zpravy')<[...d.querySelectorAll('#home>section')].findIndex(x=>x.id==='prehled'));
for(const path of ['odjezdy','jidelnicky','finance']){const page=parseHTML(await readFile(new URL('../'+path+'/index.html',import.meta.url),'utf8')).document;assert.ok(page.querySelector('.subpage-back a'));assert.notEqual(page.querySelector('.subpage-back a').getAttribute('href'),' /#'+path);}
const source={items:[{id:'255',title:'Strašidla <b>ve Rtyni</b>',summary:'Pozvánka pro rodiny',payload:{}}]};
const meta=detailMeta('https://prortyni.cz/?zprava=255&fbclid=tracking',source);assert.equal(meta.canonical,'https://prortyni.cz/?zprava=255');assert.equal(meta.title,'Strašidla ve Rtyni | Pro Rtyni');assert.equal(detailMeta('https://prortyni.cz/?zprava=255',source,[],{overrides:[{target:'255',data:{hidden:true}}]}),null);
assert.equal(detailMeta('https://prortyni.cz/?zprava=missing',source),null);
assert.equal(qualityIssues({items:[{id:1,title:'Akce',payload:{kind:'event'},summary:'Pozvánka'}]})[0].reason,'Chybí datum akce');
if(oldDoc)globalThis.document=oldDoc;else delete globalThis.document;if(oldLoc)globalThis.location=oldLoc;else delete globalThis.location;
console.log('PASS: immediate snapshot, authoritative live withdrawal, full failure, focused service pages, priority, safe detail metadata and editorial quality checks');

// Prevent accidental visual markup changes in the three user-protected areas.
const {createHash}=await import('node:crypto');
for(const [selector,expected] of [[".site-header","43d183c25d7df251595b3188381ee6cf7eda856bf271c5a0f300a25c6bd7d719"],[".intro-banner","6e1ed42d4722cc10b8603762a976e3af1f581d74230addf15ed67eefd5e78d3a"],[".daily-overview","d2726a0c3bb6b903f56cb3566889b61f07ab53e791151dd7cf082eddf5086c48"]])assert.equal(createHash('sha256').update(d.querySelector(selector).outerHTML).digest('hex'),expected,'Protected markup changed: '+selector);
console.log('PASS: original header, slider and rapid information markup preserved');

// A reload near the footer must not leave empty home sections waiting for scroll.
const {watchSection,runSection,keepViewport}=await import('../assets/progressive.js');
const savedGlobals={window:globalThis.window,document:globalThis.document,location:globalThis.location};
let observed=0,loads=0;
const homeRoot={id:'home-test',dataset:{},closest:selector=>selector==='#home'?{}:null};
const outside={id:'other-test',dataset:{},closest:()=>null,contains:()=>false};
globalThis.document={getElementById:id=>id==='home-test'?homeRoot:outside};globalThis.window={IntersectionObserver:true};globalThis.location={hash:''};globalThis.IntersectionObserver=class{observe(){observed++;}unobserve(){}};
watchSection('home-test',()=>{loads++;});await runSection('home-test');await runSection('home-test');assert.equal(loads,1);assert.equal(observed,0,'Home cards must not depend on viewport entry');
watchSection('other-test',()=>{});assert.equal(observed,1,'Non-home deferred jobs remain supported');
let top=200,scroll;
const anchor={isConnected:true,getBoundingClientRect:()=>({top})},reader={scrollY:3000,innerWidth:390,innerHeight:844,scrollTo:value=>{scroll=value.top;}};
const viewDoc={elementFromPoint:()=>({closest:()=>anchor})};
keepViewport(()=>{top+=450;},reader,viewDoc);assert.equal(scroll,3450,'Background content above the footer must preserve its screen position');
scroll=undefined;keepViewport(()=>{top+=100;reader.scrollY=2800;},reader,viewDoc);assert.equal(scroll,undefined,'Never override scrolling performed during an update');
assert.throws(()=>keepViewport(()=>{throw new Error('render failed');},reader,{elementFromPoint:()=>null}),/render failed/);
for(const [k,v] of Object.entries(savedGlobals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}delete globalThis.IntersectionObserver;
assert.ok(!(await readFile(new URL('../assets/style.css',import.meta.url),'utf8')).includes('contain-intrinsic-size:auto 650px'));
console.log('PASS: eager bounded home sections, one-time execution, viewport preservation and user-scroll cancellation');
