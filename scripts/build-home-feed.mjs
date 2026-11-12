import {readFile,writeFile} from 'node:fs/promises';
import {mergePracticalInfo} from '../assets/practical-info.js';
import {mergePosterEvents} from '../assets/poster-events.js';
const read=async name=>JSON.parse(await readFile('data/'+name+'.json','utf8'));
let feed=await read('public-feed');for(const name of ['practical-info','local-services'])feed=mergePracticalInfo(feed,await read(name));feed=mergePosterEvents(feed,await read('poster-events'));
const items=feed.items.map(x=>{const payload={...x.payload};for(const key of ['blocks','sections','attachments','images','contacts','activities','days','preschool_days','fees','profile_sources','opening_hours'])delete payload[key];if(payload.body)payload.body=payload.body.filter(x=>typeof x==='string').slice(0,2).map(x=>x.slice(0,300));return {...x,payload};});
const compact={...feed,items,posts:(feed.posts||[]).map(({body,...x})=>x)};
await writeFile('data/home-feed.json',JSON.stringify(compact));
console.log('Compact initial feed:',Buffer.byteLength(JSON.stringify(compact)),'bytes');
// Public discoverability: focused pages and individual detail URLs only.
const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const hidden=new Set((await read('public-content')).overrides.filter(x=>x.data?.hidden).map(x=>String(x.target)));
const urls=['/','/zpravy/','/inzerce/','/bydleni/','/novinky/','/odjezdy/','/jidelnicky/','/finance/'];
for(const x of items)if(!hidden.has(String(x.id))&&x.payload?.in_latest!==false)urls.push('/?'+(x.source_key==='editorial'?'prispevek':'zprava')+'='+encodeURIComponent(x.id));
const editorial=await read('editorial-news');for(const x of editorial.articles||[])if(!x.status||x.status==='published')urls.push('/zpravy/?clanek='+encodeURIComponent(x.slug||x.id));
await writeFile('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(urls)].map(path=>'<url><loc>'+escape('https://prortyni.cz'+path)+'</loc></url>').join('')+'</urlset>');
