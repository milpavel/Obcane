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
for(const [selector,expected] of [[".site-header","b803240b16f2b0204e35b587192a24131cf95146486c33df7beaff5829b1f912"],[".intro-banner","6e1ed42d4722cc10b8603762a976e3af1f581d74230addf15ed67eefd5e78d3a"],[".daily-overview","d2726a0c3bb6b903f56cb3566889b61f07ab53e791151dd7cf082eddf5086c48"]])assert.equal(createHash('sha256').update(d.querySelector(selector).outerHTML).digest('hex'),expected,'Protected markup changed: '+selector);
console.log('PASS: original header, slider and rapid information markup preserved');
