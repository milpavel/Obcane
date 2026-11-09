import {communitySources,communityPublished} from './community-sources.ts';
import {clubProfile} from './club-profiles.ts';
import WordExtractor from 'npm:word-extractor@1.0.4';
import { DOMParser, parseHTML } from 'npm:linkedom@0.18.12';
import { Buffer } from 'node:buffer';
export const extraSources = [
 ...communitySources,
 {key:'calendar',name:'Kalendář města',url:'https://www.rtyne.cz/kalendar-udalosti',category:'Akce'},
 {key:'library',name:'Městská knihovna',url:'https://www.mkrtyne.cz/akce.html',category:'Knihovna'},
 {key:'preschool_menu',name:'Jídelníček MŠ',url:'https://www.msrtyne.cz/',category:'Jídelníček MŠ'},
 {key:'clubs',name:'Spolky a sportovní oddíly',url:'https://www.rtyne.cz/spolky-a-sdruzeni',category:'Spolky'},
 {key:'services',name:'Praktické informace města',url:'https://www.rtyne.cz/svoz-odpadu-a-odpadove-hospodarstvi',category:'Praktické informace'},
 {key:'museum',name:'Muzeum a infocentrum',url:'https://www.muzeumrtyne.cz/akce',category:'Kultura'},
];
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const slug=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,140);
// Only editorial content belongs in the public view, never CMS component labels.
export const cleanContent=(value:any)=>String(value||'').replace(/\s+/g,' ').trim().replace(/^(?:Text stránky|Text složky|Text rubriky|Náplň činnosti)\s*/i,'').trim();
const cmsLabel=/^(?:Dlaždice|Text stránky|Text složky|Text rubriky|Dokumenty|Přílohy|Náplň činnosti|Odkazy|Fotogalerie|Sdílet|Tisk|Menu|ukázat na mapě)$/i;
export function contentBlocks(root:any,base:string){
 if(!root)return [];
 const copy=root.cloneNode(true);copy.querySelectorAll('.org-opening-hours-container__list,.org-adress-container__list').forEach((n:any)=>{n.replaceWith(...Array.from(n.querySelectorAll('section')));});copy.querySelectorAll('script,style,nav,footer,header,.element-type-heading,.article__documents,.article__related-links,.share-container,.article__tags,.article__link-elements,.global-attachment').forEach((n:any)=>n.remove());
 for(const field of Array.from(copy.querySelectorAll('.article__databox,.article__ico,.article__dic')) as any[]){const value=cleanContent(field.querySelector('.text-component')?.textContent);if(value){const p=copy.ownerDocument.createElement('p');p.textContent=(field.matches('.article__databox')?'Datová schránka: ':field.matches('.article__ico')?'IČO: ':'DIČ: ')+value;field.replaceChildren(p);}}
 const out:any[]=[],seen=new Set<string>();let provider='';
 const text=(n:any)=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
 function add(b:any){const key=JSON.stringify(b);if(!seen.has(key)){out.push(b);seen.add(key);}}
 for(const n of Array.from(copy.querySelectorAll('h2,h3,h4,p,ul,ol,table,address,iframe')) as any[]){
  if(n.closest('td,th')||n.closest('li')&&!['UL','OL'].includes(n.tagName)||n.parentElement?.closest('ul,ol')&&!['UL','OL'].includes(n.tagName)||n.tagName!=='TABLE'&&n.closest('table'))continue;
  if(n.tagName==='IFRAME'){try{const u=new URL(n.getAttribute('src'),base);if(u.protocol==='https:'&&['www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))add({type:'paragraph',text:'Video k tématu',links:[{text:'Přehrát video',url:u.href}]});}catch{}continue;}
  if(n.tagName==='TABLE'){const rows=Array.from(n.querySelectorAll('tr')).map((r:any)=>Array.from(r.querySelectorAll('th,td')).map(text));if(rows.length)add({type:'table',rows});continue;}
  if(['UL','OL'].includes(n.tagName)){if(n.querySelector('ul,ol'))continue;const items=Array.from(n.children).filter((x:any)=>x.tagName==='LI').map(text).filter(Boolean);if(items.length)add({type:'list',items,ordered:n.tagName==='OL'});continue;}
  const value=cleanContent(text(n));if(!value||cmsLabel.test(value)||/^(?:ID datové schránky|IČO|DIČ)\s*:?$/i.test(value))continue;
  if(/^MUDr\.|^LÉKÁRNA /i.test(value)&&value.length<85){if(provider===value)continue;provider=value;seen.clear();add({type:'heading',level:2,text:value});continue;}
  if(/^H[234]$/.test(n.tagName)||/^(?:Ordinační hodiny|Otevírací doba|Pracovní doba|Smluvní pojišťovny|Kontakt|Adresa|Bankovní spojení)$/i.test(value)){add({type:'heading',level:n.tagName==='H2'?2:3,text:value});continue;}
  // Preserve line breaks used for addresses and opening hours.
  const c=n.cloneNode(true);c.querySelectorAll('br').forEach((br:any)=>br.replaceWith('__CONTENT_BREAK__'));
  const lines=c.textContent.split('__CONTENT_BREAK__').map(cleanContent).filter(Boolean);
  for(let line of lines){
   line=line.replace(/\s*-\s*ve vyhledávačích.*$/i,'');
   if(/^Zubní ordinace$/i.test(line))continue;
   if(/1213[-–]15/.test(line)){line='Ordinační hodiny od pondělí do středy nejsou na webu města jednoznačně zapsané. Potvrďte si je prosím telefonicky v ordinaci.';}
   const links=Array.from(n.querySelectorAll('a[href]')).map((a:any)=>{try{const u=new URL(a.getAttribute('href'),base);return ['http:','https:','mailto:','tel:'].includes(u.protocol)&&!u.username&&!u.password?{text:text(a),url:u.href}:null;}catch{return null;}}).filter(Boolean);
   add({type:'paragraph',text:line,...(links.length?{links}:{})});
  }
 }return out.slice(0,220);
}
export const serviceDescriptions:Record<string,string>={
 'pecovatelska-sluzba':'Pomoc v domácnosti, osobní péče a podpora soběstačnosti. Kontakty, jak požádat o službu a potřebné dokumenty.',
 'lekarske-sluzby-1':'Praktičtí lékaři, dětská a zubní ordinace i lékárna. Kontakty a přehled ordinačních hodin.',
 'skladka-pod-haldou':'Otevírací doba, kontakty a ceníky pro odevzdání odpadu.',
 'kontakt':'Kontakty městského úřadu, úřední hodiny, adresa a bankovní spojení.',
 'doprava-senioru-senior-taxi':'Žádost o dopravu Senior TAXI a dokumenty k využití služby.',
 'svoz-odpadu-a-odpadove-hospodarstvi':'Informace o svozu komunálního a tříděného odpadu, sběru a nakládání s odpady.'
};
export async function serviceDetail(doc:any,url:string,page:any,clean:any){
 const root=doc.querySelector('article.article');if(!root)throw Error('Chybí obsah služby');
 const blocks=contentBlocks(root.querySelector('.article__body')||root,url),found=assets(root,url),sections:any[]=[],links:any[]=[];
 const children=Array.from(root.querySelectorAll('.tile__link,.document__link')) as any[];
 for(const a of children){const target=new URL(a.getAttribute('href'),url);if(target.hostname!==new URL(url).hostname||!['http:','https:'].includes(target.protocol))continue;const title=clean(a.textContent);links.push({title,url:target.href});
  // Follow information and document pages, not unrelated news archives.
  if(blocks.length&&!a.matches('.tile__link')||sections.length>=6||/^(Akce|Výroční zprávy|Svozový kalendář|Aktuální informace)/i.test(title))continue;
  try{const d=await page(target.href),r=d.querySelector('article.article'),b=contentBlocks(r?.querySelector('.article__body'),target.href),f=assets(r,target.href);if(b.length||f.attachments.length)sections.push({title,blocks:b,attachments:f.attachments});}catch{/* Keep a usable link if a child is temporarily unavailable. */}
 }
 return {blocks,sections,service_links:links.slice(0,15),content_version:2,...found};
}
export function richText(root:any,clean:any):string[]{
 if(!root)return [];
 const out:string[]=[];
 for(const n of Array.from(root.querySelectorAll('p,li,h2,h3,tr,address')) as any[]){
  if(n.closest('nav,footer,.article__related-links,.share-container'))continue;
  if(n.tagName!=='TR'&&n.closest('table'))continue;
  if(n.tagName==='P'&&n.closest('li'))continue;
  const t=n.tagName==='TR'?Array.from(n.querySelectorAll('th,td')).map((x:any)=>clean(x.textContent)).join(' · '):clean(n.textContent);
  if(t&&t.length>1&&!cmsLabel.test(t)&&!out.includes(cleanContent(t)))out.push(cleanContent(t));
 }return out.slice(0,180);
}
export function assets(root:any,base:string){
 const images:any[]=[],attachments:any[]=[];
 for(const a of Array.from(root?.querySelectorAll('a[href]')||[]) as any[]){try{const u=new URL(a.getAttribute('href'),base);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)continue;const label=(a.textContent||'').replace(/\s+/g,' ').trim();if(!label)continue;if(/\.pdf(?:$|\?)|\/file\/|\.docx?(?:$|\?)/i.test(u.href)||a.matches('.global-attachment__link'))attachments.push({title:label.slice(0,150),url:u.href,type:a.getAttribute('data-attachment-type')||(/\.pdf/.test(u.pathname)?'pdf':'link')});}catch{}}
 for(const im of Array.from(root?.querySelectorAll('img[src]')||[]) as any[]){try{const u=new URL(im.getAttribute('src'),base);if(u.protocol==='https:'&&u.hostname.replace(/^www\./,'')===new URL(base).hostname.replace(/^www\./,'')&&!/logo|favicon|facebook|youtube|mapa|icko|icon|brand/i.test(u.pathname)&&!im.closest('nav,header,footer'))images.push({url:u.href,alt:im.getAttribute('alt')||'Pozvánka od pořadatele'});}catch{}}
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
export function canonicalSourceURL(value:string){const u=new URL(value);for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.href;}
export async function extractExtra(s:any,h:any):Promise<any[]|null>{
 const {page,text,clean,eventDate,czDate,safeURL}=h;
 if(!extraSources.some(x=>x.key===s.key))return null;
 let out:any[]=[];
 if(s.feed==='rss'||s.feed==='json'){
  const r=await fetch(s.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Spolkový zdroj HTTP '+r.status);const raw=await r.text();if(raw.length>3000000)throw Error('Zdroj je příliš velký');
  const entries=s.key==='koletovka'?JSON.parse(raw):Array.from(new DOMParser().parseFromString(raw,'text/xml').querySelectorAll('item')).slice(0,20);
  for(const x of entries){if(s.news_category&&!Array.from(x.querySelectorAll('category')).some((c:any)=>c.textContent===s.news_category))continue;let title,link,content,published;
   if(s.key==='koletovka'){title=x.title?.rendered;link=x.link;content=x.content?.rendered;published=x.date_gmt?x.date_gmt+'Z':null;}
   else{title=x.querySelector('title')?.textContent;link=x.querySelector('link')?.textContent;content=Array.from(x.children).find((c:any)=>c.tagName==='content:encoded')?.textContent||x.querySelector('description')?.textContent;const d=new Date(x.querySelector('pubDate')?.textContent||'');published=Number.isFinite(d.getTime())?d.toISOString():null;}
   if(!content)content=x.querySelector?.('description')?.textContent||'';
   const d=parseHTML('<article>'+String(content||'')+'</article>').document;d.querySelectorAll('script,style,nav,footer,form').forEach((n:any)=>n.remove());const root=d.querySelector('article'),body=richText(root,clean),heading=parseHTML('<b>'+String(title||'')+'</b>').document.querySelector('b');
   if(!title||!link)continue;
   const dates=communityDates(text(heading),body.join(' '),eventDate),item:any={title:text(heading),url:canonicalSourceURL(safeURL(link,s.url)),body,summary:body.join(' ').slice(0,350),published,event:dates[0]||null,detail_ok:true,extra:{kind:dates.length?'event':'community',blocks:contentBlocks(root,s.url),...assets(root,s.url)}};
   if(!body.length&&out.length<6)try{const detail=await page(item.url,s.url),main=detail.querySelector('.entry-content,#main-content,main article,article');if(main){const copy=main.cloneNode(true);copy.querySelectorAll('nav,header,footer,.et_pb_menu,.et_pb_fullwidth_menu,.et_pb_sidebar,.post-meta').forEach((n:any)=>n.remove());item.body=richText(copy,clean);item.summary=item.body.join(' ').slice(0,350)||item.summary;item.extra={...item.extra,blocks:contentBlocks(copy,item.url),...assets(copy,item.url)};}}catch{}
   if(dates.some(date=>date>=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}))){
    const detailLink=Array.from(root.querySelectorAll('a[href]')).find((a:any)=>/informace|podrobnosti/i.test(body.join(' '))&&a.getAttribute('href')&&!/\.(jpg|png|pdf)/i.test(a.getAttribute('href')));
    if(detailLink)try{const url=safeURL((detailLink as any).getAttribute('href'),s.url),detail=await page(url,s.url),main=detail.querySelector('.entry-content,main article,main')||detail.body;const more=richText(main,clean);if(more.length){item.body=[...new Set([...body,...more])];item.summary=more.join(' ').slice(0,350);item.extra={...item.extra,blocks:contentBlocks(main,url),...assets(main,url),event_sources:[{title:'Podrobnosti od pořadatele',url}]};}}catch{/* RSS invitation remains usable. */}
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
  if(!entries.length)throw Error('Ve zdroji nebyly nalezeny zprávy; web může být nedostupný nebo změněný');return out;
 }
 const doc=await page(s.url);
 if(s.feed==='florbal'){
  const seen=new Set();for(const a of Array.from(doc.querySelectorAll('a[href^="/c/"]')) as any[]){const url=safeURL(a.getAttribute('href'),s.url);if(seen.has(url))continue;seen.add(url);const card=a.closest('article'),title=text(card?.querySelector('.article-title-heading')||a.querySelector('.article-title-heading'));if(!title)continue;
   let published=communityPublished(text(card?.querySelector('.article-meta-date')),czDate),body:any[]=[],summary=text(card?.querySelector('.article-perex'));
   try{const d=await page(url,s.url),root=d.querySelector('h1.heading-2')?.closest('article');if(!root)throw Error('Chybí článek');body=richText(root.querySelector('.prose'),clean);summary=text(root.querySelector('.perex'))||summary;published=communityPublished(text(root.querySelector('.article-meta-date')),czDate)||published;}catch{/* The attributed list entry is still usable. */}
   out.push({title,url,published,summary,body,detail_ok:true,extra:{kind:'community'}});if(out.length>=8)break;
  }if(!out.length)throw Error('Nenalezeny články florbalu');return out;
 }
 if(s.feed==='estranky'){
  const seen=new Set();for(const a of Array.from(doc.querySelectorAll('a[href]')) as any[]){const href=a.getAttribute('href');if(!href?.startsWith('/clanky/clanky/')||!href.endsWith('.html')||seen.has(href)||!text(a)||/Celý příspěvek/.test(text(a)))continue;seen.add(href);const url=safeURL(href,s.url),container=a.closest('article,.article,.entry,.post')||a.parentElement?.parentElement,published=czDate(text(container));let body:any[]=[];try{const d=await page(url,s.url),root=d.querySelector('#main,#content,.article-content,.entry-content');body=richText(root,clean).filter(t=>!/^Celý příspěvek|Rubrika:|Komentáře|Menu$/.test(t));}catch{}out.push({title:text(a),url,published,summary:body[0]||'Příspěvek z oddílového archivu. Datum uvádíme podle původního webu.',body:body.slice(0,12),detail_ok:true,extra:{kind:'community',archive:true}});if(out.length>=5)break;}
  return out;
 }
 if(s.feed==='local'){
  // Do not import a central Prague workshop or an old organization history as local news.
  for(const card of Array.from(doc.querySelectorAll('article.news,article.post,.news-item')) as any[]){const heading=card.querySelector('h2 a,h3 a'),body=richText(card,clean),published=czDate(text(card.querySelector('time,.date')));if(!heading||!published||!/(Rtyn|rtyň)/i.test(text(card)))continue;out.push({title:text(heading),url:safeURL(heading.getAttribute('href'),s.url),published,body,summary:body.join(' ').slice(0,350),detail_ok:true,extra:{kind:'community'}});}
  return out;
 }
 if(s.key==='library'){
  out=Array.from(doc.querySelectorAll('.news-item')).slice(0,15).map((c:any)=>{
   const title=text(c.querySelector('h2')),body=richText(c.querySelector('.news-item-content'),clean),content=body.join(' ');
   const event=eventDate(content),cancelled=/nekoná|zruš|odvolán/i.test(title+' '+content);
   return {title,url:s.url+'#'+slug(title),summary:content.slice(0,350),body,event,detail_ok:true,extra:{kind:'event',cancelled,blocks:contentBlocks(c.querySelector('.news-item-content'),s.url),...assets(c,s.url)}};
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
  for(const x of out){await pause(1100);try{const d=await page(x.url,s.url);x.body=richText(d.querySelector('.article__text .text-component'),clean);x.summary=x.summary||text(d.querySelector('.article__perex'))||x.body.join(' ').slice(0,350);x.extra={...x.extra,blocks:contentBlocks(d.querySelector('.article__text .text-component'),x.url),...assets(d.querySelector('article.article'),x.url)};x.detail_ok=!!(x.body.length||x.extra.images.length||x.extra.attachments.length);}catch(e){x.detail_error=String(e).slice(0,160);}}
 }else if(s.key==='clubs'){
  const sport=await page('https://www.rtyne.cz/sportovni-organizace');
  const seen=new Set();for(const d of [doc,sport])for(const a of Array.from(d.querySelectorAll('.tile__link')) as any[]){const title=text(a),href=new URL(a.getAttribute('href'),s.url).href;if(seen.has(href)||!/^https?:/.test(href))continue;seen.add(href);out.push({title,url:s.url+'#'+slug(title),summary:'Místní organizace uvedená v přehledu města. Otevřete profil pro web a další informace.',body:[],detail_ok:true,...clubProfile(title,href),extra:{kind:'club',website:href,directory_source:s.url,in_latest:true,...clubProfile(title,href).extra,news_source_key:communitySources.find(c=>c.profile===title)?.key||null}});}
 }else if(s.key==='services'){
  const paths=['svoz-odpadu-a-odpadove-hospodarstvi','svozovy-kalendar-'+new Date().getUTCFullYear(),'skladka-pod-haldou','kontakt','lekarske-sluzby-1','doprava-senioru-senior-taxi','informace-k-uhradam-mistnich-poplatku-v-roce-'+new Date().getUTCFullYear(),'pecovatelska-sluzba'];
  for(const path of paths){await pause(1100);const url='https://www.rtyne.cz/'+path;try{const d=url===s.url?doc:await page(url),root=d.querySelector('article.article');const title=text(d.querySelector('h1.article__heading'));if(!title)throw Error('Chybí název služby');const detail=await serviceDetail(d,url,page,clean),body=richText(root.querySelector('.article__text'),clean);out.push({title,url,summary:serviceDescriptions[path]||cleanContent(text(d.querySelector('.article__perex')))||body[0]?.slice(0,240)||'Informace a dokumenty k této službě.',body,detail_ok:true,extra:{kind:'service',...detail}});}catch(e){out.push({title:path.replaceAll('-',' '),url,body:[],detail_error:String(e).slice(0,160),extra:{kind:'service'}});}}
 }else if(s.key==='museum'){
  const root=doc.querySelector('.articlesBlock .text')||doc.querySelector('main article')||doc.querySelector('main');if(!root)throw Error('Chybí obsah muzea');
  const blocks=contentBlocks(root,s.url),sections:any[]=[];
  const card=doc.querySelector('.articleColumn .vcard');if(card){const values=[card.querySelector('.adr')?.textContent,...Array.from(card.querySelectorAll('a.tel,a.email')).map((n:any)=>n.textContent)].map(cleanContent).filter(Boolean);sections.push({title:'Kontakt a návštěva',blocks:values.map(text=>({type:'paragraph',text}))});}
  const hours=doc.querySelector('.articleColumn .blok:nth-child(2) .pravy');if(hours){const copy=hours.cloneNode(true);copy.querySelectorAll('br').forEach((n:any)=>n.replaceWith('\n'));sections.push({title:'Otevírací doba',blocks:copy.textContent.split('\n').map(cleanContent).filter(Boolean).map((text:string)=>({type:'paragraph',text}))});}
  out=[{title:'Muzeum a infocentrum: akce a návštěvní informace',url:s.url,summary:'Program muzea, pozvánky, kontakty a informace o provozu.',body:richText(root,clean),detail_ok:true,extra:{kind:'service',blocks,sections,content_version:2,...assets(root,s.url)}}];
 }
 if(!out.length&&s.key!=='calendar')throw Error('Změnila se struktura zdroje: nenalezený obsah');return out;
}
