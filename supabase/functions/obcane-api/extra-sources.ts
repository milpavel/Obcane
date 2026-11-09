import {clubProfile} from './club-profiles.ts';
import WordExtractor from 'npm:word-extractor@1.0.4';
import { DOMParser, parseHTML } from 'npm:linkedom@0.18.12';
import { Buffer } from 'node:buffer';
export const extraSources = [
 {key:'scouts',name:'Skaut – středisko Permoník',url:'https://skaut-rtyne.skauting.cz/feed/',category:'Spolky'},
 {key:'orel',name:'Orel Rtyně',url:'https://www.orelrtyne.cz/feed/',category:'Sport a spolky'},
 {key:'koletovka',name:'Koletova hornická hudba',url:'https://koletovka.cz/wp-json/wp/v2/posts?per_page=5',category:'Kultura a spolky'},
 {key:'calendar',name:'Kalendář města',url:'https://www.rtyne.cz/kalendar-udalosti',category:'Akce'},
 {key:'library',name:'Městská knihovna',url:'https://www.mkrtyne.cz/akce.html',category:'Knihovna'},
 {key:'preschool_menu',name:'Jídelníček MŠ',url:'https://www.msrtyne.cz/',category:'Jídelníček MŠ'},
 {key:'clubs',name:'Spolky a sportovní oddíly',url:'https://www.rtyne.cz/spolky-a-sdruzeni',category:'Spolky'},
 {key:'services',name:'Praktické informace města',url:'https://www.rtyne.cz/svoz-odpadu-a-odpadove-hospodarstvi',category:'Praktické informace'},
 {key:'museum',name:'Muzeum a infocentrum',url:'https://www.muzeumrtyne.cz/akce',category:'Kultura'},
];
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const slug=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,140);
export function richText(root:any,clean:any):string[]{
 if(!root)return [];
 const out:string[]=[];
 for(const n of Array.from(root.querySelectorAll('p,li,h2,h3,tr,address')) as any[]){
  if(n.closest('nav,footer,.article__related-links,.share-container'))continue;
  if(n.tagName!=='TR'&&n.closest('table'))continue;
  if(n.tagName==='P'&&n.closest('li'))continue;
  const t=n.tagName==='TR'?Array.from(n.querySelectorAll('th,td')).map((x:any)=>clean(x.textContent)).join(' · '):clean(n.textContent);
  if(t&&t.length>1&&!out.includes(t))out.push(t);
 }return out.slice(0,180);
}
export function assets(root:any,base:string){
 const images:any[]=[],attachments:any[]=[];
 for(const a of Array.from(root?.querySelectorAll('a[href]')||[]) as any[]){try{const u=new URL(a.getAttribute('href'),base);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)continue;const label=(a.textContent||'').replace(/\s+/g,' ').trim();if(!label)continue;if(/\.pdf(?:$|\?)|\/file\/|\.docx?(?:$|\?)/i.test(u.href)||a.matches('.global-attachment__link'))attachments.push({title:label.slice(0,150),url:u.href,type:a.getAttribute('data-attachment-type')||(/\.pdf/.test(u.pathname)?'pdf':'link')});}catch{}}
 for(const im of Array.from(root?.querySelectorAll('img[src]')||[]) as any[]){try{const u=new URL(im.getAttribute('src'),base);if(u.protocol==='https:'&&u.hostname===new URL(base).hostname)images.push({url:u.href,alt:im.getAttribute('alt')||'Pozvánka od pořadatele'});}catch{}}
 return {images:images.slice(0,8),attachments:attachments.slice(0,15)};
}
export function parsePreschoolMenu(raw:string,url:string,czDate:any){
 const range=raw.match(/od:\s*(\d{1,2})\.\s*(\d{1,2})\.\s*do:\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/i);
 if(!range)throw Error('Jídelníček MŠ nemá jednoznačně určený týden');
 const startYear=Number(range[2])>Number(range[4])?Number(range[5])-1:Number(range[5]);
 const start=czDate(`${range[1]}.${range[2]}.${startYear}`),end=czDate(`${range[3]}.${range[4]}.${range[5]}`);
 if(!start||!end||end<start)throw Error('Neplatný týden jídelníčku');
 const matches=[...raw.matchAll(/(Pondělí|Úterý|Středa|Čtvrtek|Pátek)\s*:/gi)];
 const labels=['pondělí','úterý','středa','čtvrtek','pátek'];
 const days=matches.map((m,i)=>{
  const day=labels.indexOf(m[1].toLowerCase());const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+day);const iso=d.toISOString().slice(0,10);
  const body=raw.slice(m.index!+m[0].length,matches[i+1]?.index||raw.length).split(/DOBROU\s+CHUT/i)[0].replace(/_{3,}/g,' ').trim();
  return {date:iso,weekday:m[1],text:body};
 });
 if(days.length!==5||days.some(d=>d.date>end))throw Error('Neúplný týden jídelníčku MŠ');
 return {title:`Jídelníček MŠ ${range[1]}. ${range[2]}. – ${range[3]}. ${range[4]}. ${range[5]}`,url,summary:'Přesnídávky, obědy a svačiny přímo z týdenního jídelníčku MŠ, včetně uvedených alergenů.',body:[],extra:{kind:'preschool_menu',week_start:start,week_end:end,preschool_days:days,menu_note:raw.slice(raw.indexOf('Změna jídelníčku')).trim()},detail_ok:true};
}
// Dates of the event are distinct from RSS publication dates.
export function communityDates(title:string,body:string,eventDate:any):string[]{
 const raw=title+' '+body,range=raw.match(/(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/);
 if(range){const a=eventDate(`${range[1]}.${range[3]}.${range[4]}`),b=eventDate(`${range[2]}.${range[3]}.${range[4]}`);if(a&&b&&b>=a){const out=[];for(let d=new Date(a+'T12:00:00Z');d.toISOString().slice(0,10)<=b&&out.length<10;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out;}}
 const explicit=eventDate(title);if(explicit)return [explicit];
 // Only invitation-like articles can supply a date from their text.
 if(!/ples|koncert|pozván|zveme|turnaj|festival|nábor|setkání/i.test(title+' '+body.slice(0,180)))return [];
 const date=eventDate(body);return date?[date]:[];
}
export async function extractExtra(s:any,h:any):Promise<any[]|null>{
 const {page,text,clean,eventDate,czDate,safeURL}=h;
 if(!extraSources.some(x=>x.key===s.key))return null;
 let out:any[]=[];
 if(['scouts','orel','koletovka'].includes(s.key)){
  const r=await fetch(s.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Spolkový zdroj HTTP '+r.status);const raw=await r.text();if(raw.length>3000000)throw Error('Zdroj je příliš velký');
  const entries=s.key==='koletovka'?JSON.parse(raw):Array.from(new DOMParser().parseFromString(raw,'text/xml').querySelectorAll('item')).slice(0,20);
  for(const x of entries){let title,link,content,published;
   if(s.key==='koletovka'){title=x.title?.rendered;link=x.link;content=x.content?.rendered;published=x.date_gmt?x.date_gmt+'Z':null;}
   else{title=x.querySelector('title')?.textContent;link=x.querySelector('link')?.textContent;content=Array.from(x.children).find((c:any)=>c.tagName==='content:encoded')?.textContent||x.querySelector('description')?.textContent;const d=new Date(x.querySelector('pubDate')?.textContent||'');published=Number.isFinite(d.getTime())?d.toISOString():null;}
   const d=parseHTML('<article>'+String(content||'')+'</article>').document;d.querySelectorAll('script,style,nav,footer,form').forEach((n:any)=>n.remove());const root=d.querySelector('article'),body=richText(root,clean),heading=parseHTML('<b>'+String(title||'')+'</b>').document.querySelector('b');
   if(!title||!link)continue;
   const dates=communityDates(text(heading),body.join(' '),eventDate),item:any={title:text(heading),url:safeURL(link,s.url),body,summary:body.join(' ').slice(0,350),published,event:dates[0]||null,detail_ok:true,extra:{kind:dates.length?'event':'community',...assets(root,s.url)}};
   if(dates.some(date=>date>=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}))){
    const detailLink=Array.from(root.querySelectorAll('a[href]')).find((a:any)=>/informace|podrobnosti/i.test(body.join(' '))&&a.getAttribute('href')&&!/\.(jpg|png|pdf)/i.test(a.getAttribute('href')));
    if(detailLink)try{const url=safeURL((detailLink as any).getAttribute('href'),s.url),detail=await page(url,s.url),main=detail.querySelector('.entry-content,main article,main')||detail.body;const more=richText(main,clean);if(more.length){item.body=[...new Set([...body,...more])];item.summary=more.join(' ').slice(0,350);item.extra={...item.extra,...assets(main,url),event_sources:[{title:'Podrobnosti od pořadatele',url}]};}}catch{/* RSS invitation remains usable. */}
   }
   out.push(item);for(const date of dates.slice(1))out.push({...item,url:item.url+'#termin-'+date,event:date,extra:{...item.extra,calendar_only:true}});
  }
  if(s.key==='koletovka'){
   const calendarDoc=await page('https://koletovka.cz/');
   for(const row of Array.from(calendarDoc.querySelectorAll('table.responsive-table tbody tr')) as any[]){
    const cells=Array.from(row.querySelectorAll('td')) as any[];if(cells.length<3)continue;
    const title=text(cells[1]),location=text(cells[2]),dates=communityDates(text(cells[0]),'',eventDate),time=location.match(/od\s+(\d{1,2}:\d{2})/i)?.[1]||null;
    for(const event of dates){if(event<new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}))continue;out.push({title,url:'https://koletovka.cz/#akce-'+slug(title)+'-'+event,event,summary:location,body:[location],detail_ok:true,extra:{kind:'event',calendar_only:true,time,location,event_sources:[{title:'Kalendář Koletovy hornické hudby',url:'https://koletovka.cz/'}]}});}
   }
  }
  if(!out.length)throw Error('Spolkový zdroj neobsahuje články');return out;
 }
 const doc=await page(s.url);
 if(s.key==='library'){
  out=Array.from(doc.querySelectorAll('.news-item')).slice(0,15).map((c:any)=>{
   const title=text(c.querySelector('h2')),body=richText(c.querySelector('.news-item-content'),clean),content=body.join(' ');
   const event=eventDate(content),cancelled=/nekoná|zruš|odvolán/i.test(title+' '+content);
   return {title,url:s.url+'#'+slug(title),summary:content.slice(0,350),body,event,detail_ok:true,extra:{kind:'event',cancelled,...assets(c,s.url)}};
  }).filter(x=>x.title);
  for(const notice of out.filter(x=>x.extra.cancelled&&x.event)){
   const words=slug(notice.title).split('-').filter(x=>x.length>4&&!['pondelni','setkani','klubiku','nekona','listopadove'].includes(x));
   for(const x of out)if(x!==notice&&x.event===notice.event&&words.some(w=>slug(x.title).includes(w)))x.extra.cancelled=true;
  }
 }else if(s.key==='preschool_menu'){
  const candidates=Array.from(doc.querySelectorAll('a[href]')).map((a:any)=>({title:text(a),url:new URL(a.getAttribute('href'),s.url).href})).filter((a:any)=>/\.docx?(?:$|\?)/i.test(a.url)&&new URL(a.url).hostname==='www.msrtyne.cz');
  if(!candidates.length)throw Error('Nenalezen dokument jídelníčku MŠ');
  const dated=candidates.map((a:any)=>{const m=decodeURIComponent(a.url).match(/(\d{1,2})\.(\d{1,2})\.\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})/);return {...a,end:m?czDate(`${m[3]}.${m[4]}.${m[5]}`):null};}).filter((a:any)=>a.end).sort((a:any,b:any)=>b.end.localeCompare(a.end));
  const item=dated[0];if(!item)throw Error('Jídelníček MŠ nemá datum v názvu');
  const r=await fetch(safeURL(item.url,s.url),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Dokument MŠ HTTP '+r.status);const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>3_000_000)throw Error('Dokument MŠ je příliš velký');
  const extracted=await new WordExtractor().extract(Buffer.from(bytes));out=[parsePreschoolMenu(extracted.getBody(),item.url,czDate)];
 }else if(s.key==='calendar'){
  const obj=doc.querySelector('meta[data-id-object]')?.getAttribute('data-id-object'),block=doc.querySelector('.events-by-day .list')?.getAttribute('data-element-type-of-object-type-block-id');
  if(!obj||!block)throw Error('Změna konfigurace kalendáře města');
  const now=new Date(),from=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});now.setUTCDate(now.getUTCDate()+120);const to=now.toISOString().slice(0,10);
  const url=new URL('/api/services/app/ObjectOverview/GetEventsByDay',s.url);url.search=new URLSearchParams({From:from+'T00:00:00',To:to+'T23:59:59',ObjectId:obj,ElementTypeOfObjectTypeBlockId:block}).toString();
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Kalendář HTTP '+r.status);const data=await r.json();if(!Array.isArray(data.result?.items))throw Error('Neplatná odpověď kalendáře');
  const unique=new Map();for(const day of data.result.items)for(const x of day.events||[]){if(unique.has(x['v-id']))continue;const item:any={title:clean(x.name),url:safeURL(x['v-viewUrl'],s.url),summary:clean(x.perex),event:day.date.slice(0,10),published:x['v-creationTime']?.slice(0,10),body:[],extra:{kind:'event',time:x.fromTime||null,end_time:x.toTime||null,cancelled:!!x.IsCanceled,in_latest:true}};unique.set(x['v-id'],item);}
  out=[...unique.values()].slice(0,30);
  for(const x of out){await pause(1100);try{const d=await page(x.url,s.url);x.body=richText(d.querySelector('.article__text .text-component'),clean);x.summary=x.summary||text(d.querySelector('.article__perex'))||x.body.join(' ').slice(0,350);x.extra={...x.extra,...assets(d.querySelector('article.article'),x.url)};x.detail_ok=!!(x.body.length||x.extra.images.length||x.extra.attachments.length);}catch(e){x.detail_error=String(e).slice(0,160);}}
 }else if(s.key==='clubs'){
  const sport=await page('https://www.rtyne.cz/sportovni-organizace');
  const seen=new Set();for(const d of [doc,sport])for(const a of Array.from(d.querySelectorAll('.tile__link')) as any[]){const title=text(a),href=new URL(a.getAttribute('href'),s.url).href;if(seen.has(href)||!/^https?:/.test(href))continue;seen.add(href);out.push({title,url:s.url+'#'+slug(title),summary:'Místní organizace uvedená v přehledu města. Otevřete profil pro web a další informace.',body:[],detail_ok:true,...clubProfile(title,href),extra:{kind:'club',website:href,directory_source:s.url,in_latest:true,...clubProfile(title,href).extra}});}
 }else if(s.key==='services'){
  const paths=['svoz-odpadu-a-odpadove-hospodarstvi','svozovy-kalendar-'+new Date().getUTCFullYear(),'skladka-pod-haldou','kontakt','lekarske-sluzby-1','doprava-senioru-senior-taxi','informace-k-uhradam-mistnich-poplatku-v-roce-'+new Date().getUTCFullYear(),'pecovatelska-sluzba'];
  for(const path of paths){await pause(1100);const url='https://www.rtyne.cz/'+path;try{const d=url===s.url?doc:await page(url),root=d.querySelector('article.article');const title=text(d.querySelector('h1.article__heading'));if(!title)throw Error('Chybí název služby');const body=richText(root,clean);out.push({title,url,summary:text(d.querySelector('.article__perex'))||body.slice(0,2).join(' ').slice(0,350),body,detail_ok:true,extra:{kind:'service',...assets(root,url)}});}catch(e){out.push({title:path.replaceAll('-',' '),url,body:[],detail_error:String(e).slice(0,160),extra:{kind:'service'}});}}
 }else if(s.key==='museum'){
  const root=doc.querySelector('main')||doc.querySelector('#content')||doc.body;const content=Array.from(root.querySelectorAll('h1,h2,h3,p')).filter((x:any)=>!x.closest('[class*="cookie"],footer,header')).map(text).filter((t:any)=>t&&t.length>6&&!/cookie|Google|osobní.+údaj|Nadpis|Text\.\.\.|fdsfas/i.test(t));
  out=[{title:'Muzeum a infocentrum: akce a návštěvní informace',url:s.url,summary:'Program muzea, pozvánky a informace o provozu.',body:[...new Set(content)].slice(0,35),detail_ok:true,extra:{kind:'service',...assets(root,s.url)}}];
 }
 if(!out.length&&s.key!=='calendar')throw Error('Změnila se struktura zdroje: nenalezený obsah');return out;
}
