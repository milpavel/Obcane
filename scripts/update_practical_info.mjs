// Fixed public sources only. Scheduled alongside the existing public snapshot.
import {parseHTML} from 'linkedom';
import WordExtractor from 'word-extractor';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const output=new URL('../data/practical-info.json',import.meta.url);
const documentDir=new URL('../documents/',import.meta.url);
const Z='https://www.zsrtyne.cz',M='https://www.msrtyne.cz',V='https://www.vakrtyne.cz';
const allowed=new Set([new URL(Z).hostname,new URL(M).hostname,new URL(V).hostname]);
const tidy=v=>String(v||'').replace(/\s+/g,' ').trim();
export function safeSource(value,base){try{const u=new URL(value,base);return u.protocol==='https:'&&allowed.has(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const cache=new Map();
async function get(url){if(!safeSource(url))throw Error('Unapproved source');if(!cache.has(url))cache.set(url,(async()=>{let error;for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok||!safeSource(r.url))throw Error('Source HTTP '+r.status);const buffer=Buffer.from(await r.arrayBuffer());if(buffer.length>12000000)throw Error('Source too large');return buffer;}catch(e){error=e;}}throw error;})());return cache.get(url);}
function root(doc){return doc.querySelector('.entry-content,.page_content,.download_content')||doc.querySelector('main');}
function decodeEmailScripts(doc){
 // Decode only known literal email encodings; never execute downloaded JavaScript.
 for(const script of doc.querySelectorAll('script')){const code=script.textContent,id=code.match(/getElementById\("([^"]+)"\)/)?.[1];let value=code.match(/decodeURIComponent\("([^"]+)"\)/)?.[1];const encoded=code.match(/var ml="([^"]+)",mi="([^"]+)"/);if(encoded)value=[...encoded[2]].map(c=>encoded[1].charAt(c.charCodeAt(0)-48)).join('');if(id&&value){try{const decoded=decodeURIComponent(value),emails=decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);if(emails?.length&&doc.getElementById(id))doc.getElementById(id).textContent=[...new Set(emails)].join(' ');}catch{}}script.remove();}
 doc.querySelectorAll('noscript,style,form,iframe,img').forEach(n=>n.remove());
 for(const br of doc.querySelectorAll('br'))br.replaceWith(doc.createTextNode('\n'));
}
async function page(url){const doc=parseHTML((await get(url)).toString('utf8')).document;decodeEmailScripts(doc);const content=root(doc);if(!content||tidy(content.textContent).length<40)throw Error('Missing content: '+url);return {doc,content,url};}
export function blocksFrom(content,base){
 const blocks=[];
 function walk(n){if(n.nodeType!==1)return;const tag=n.tagName.toLowerCase(),text=tidy(n.textContent);if(!text)return;
  if(/^h[1-6]$/.test(tag)){blocks.push({type:'heading',level:tag==='h2'?2:3,text});return;}
  if(tag==='table'){const rows=[...n.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('th,td')].map(c=>tidy(c.textContent)));if(rows.length)blocks.push({type:'table',rows});return;}
  if(tag==='ul'||tag==='ol'){const items=[...n.children].filter(c=>c.tagName==='LI').filter(c=>!c.querySelector('a[href]')||!c.querySelector('a[href]').getAttribute('href').match(/\.(pdf|docx?|xlsx?)(?:$|\?)/i)).map(c=>tidy(c.textContent));if(items.length)blocks.push({type:'list',ordered:tag==='ol',items});return;}
  if(tag==='p'){if(/^Dokument .*k dispozici ke stažení/.test(text))return;const links=[...n.querySelectorAll('a[href]')].map(a=>({text:tidy(a.textContent),url:new URL(a.getAttribute('href'),base).href})).filter(a=>/^https?:/.test(a.url)&&!a.url.startsWith(base+'/pro-zaky/skolni-jidelna/'));if(text)blocks.push({type:'paragraph',text, ...(links.length?{links}:{})});return;}
  for(const child of n.children)walk(child);
 }
 for(const child of content.children)walk(child);return blocks;
}
function documents(content,base,label){const found=new Map();for(const a of content.querySelectorAll('a[href]')){const url=safeSource(a.getAttribute('href'),base),ext=url?.match(/\.(pdf|docx?|xlsx?)(?:$|\?)/i)?.[1]?.toLowerCase();if(!ext)continue;const title=label||tidy(a.querySelector('h4')?.textContent||a.textContent).replace(/\s*(?:PDF|DOCX?) Dokument$/i,'');if(!found.has(url))found.set(url,{title:title||decodeURIComponent(new URL(url).pathname.split('/').at(-1)),url,type:ext});}return [...found.values()];}
const displayDate=d=>new Date(d+'T12:00:00Z').toLocaleDateString('cs-CZ',{day:'numeric',month:'numeric',year:'numeric',timeZone:'Europe/Prague'});
const months={ledna:1,února:2,března:3,dubna:4,května:5,června:6,července:7,srpna:8,září:9,října:10,listopadu:11,prosince:12};
export function parseSchoolHolidays(content){
 const result=[];for(const p of content.querySelectorAll('p')){const text=tidy(p.textContent),name=text.match(/(Podzimní|Vánoční|pololetní|Jarní|Velikonoční|Hlavní) prázdniny/i)?.[0];if(!name)continue;
 const dates=[...text.matchAll(/(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince|\d{1,2}\.)(?:\s*(20\d{2}))?/gi)].map(m=>({d:+m[1],m:months[m[2].toLowerCase()]||parseInt(m[2]),y:m[3]?+m[3]:null}));
 const fallback=dates.find(d=>d.y)?.y;if(!fallback||!dates.length)throw Error('Unrecognized holiday dates');
 const iso=d=>{const y=d.y||fallback,s=`${y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;if(new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('Invalid holiday date');return s;};
 const start=iso(dates[0]),end=iso(dates.at(-1));if(start>end)throw Error('Inverted holiday dates');result.push({name:name[0].toUpperCase()+name.slice(1),start,end});
 }if(result.length<6)throw Error('Incomplete school calendar');return result;
}
async function enrichDocument(d,previous){
 try{const original=d.url,buf=await get(original),file=createHash('sha256').update(original).digest('hex').slice(0,20)+'.'+d.type;await mkdir(documentDir,{recursive:true});await writeFile(new URL(file,documentDir),buf);d.original_url=original;d.url='/documents/'+file;d.checked_at=new Date().toISOString();
  if(d.type==='doc'||d.type==='docx'){const word=await new WordExtractor().extract(buf);d.text=word.getBody().trim();}
  else if(d.type==='pdf'){d.text=execFileSync('python',['-c','import sys,fitz; d=fitz.open(stream=sys.stdin.buffer.read(),filetype="pdf"); print("\\n\\n".join(p.get_text(sort=True) for p in d))'],{input:buf,maxBuffer:3000000}).toString().trim();}
  if(!d.text&&['pdf','doc','docx'].includes(d.type))d.text_unavailable=true;
 }catch{const old=previous?.find(a=>(a.original_url||a.url)===(d.original_url||d.url));if(old?.text){d.text=old.text;d.checked_at=old.checked_at;}if(!d.original_url&&old?.original_url){d.original_url=old.original_url;d.url=old.url;}d.text_unavailable=true;}
 return d;
}
export async function update(){
 let previous={items:[]};try{previous=JSON.parse(await readFile(output,'utf8'));}catch{}
 const now=new Date().toISOString(),items=[],errors=[];
 const definitions=[
 ['zs','Základní škola a ZUŠ','Kontakty na školu, vedení, budovu na náměstí a školní jídelnu.',Z+'/kontakty',async p=>({blocks:blocksFrom(p.content,Z),attachments:documents(p.content,Z)})],
 ['ms','Mateřská škola','Kontakty, informace pro rodiče a dokumenty mateřské školy.',M+'/kontakty',async p=>{const about=await page(M+'/o-nas'),downloads=await page(M+'/ke-stazeni');return {sections:[{title:'Kontakty',blocks:blocksFrom(p.content,M).filter(b=>b.text!=='napište nám')},{title:'O mateřské škole',blocks:[{type:'paragraph',text:'Mateřská škola na adrese Na Drahách 736 má čtyři třídy: Žabičky, Rybičky, Kačenky a Želvičky. Vzdělávání se zaměřuje na přírodu, zdravý vývoj, komunikaci a přípravu na vstup do základní školy. Třída Želviček poskytuje také logopedickou péči.'}]}],attachments:documents(downloads.content,M).filter(d=>/školní řád|denní řád|školní vzdělávací|pověření|kritéria|žádost o přijetí dítěte k|poprvé|úplata za/i.test(d.title)),source_urls:[M+'/o-nas',M+'/ke-stazeni']};}],
 ['jidelna-zs','Školní jídelna ZŠ','Přihlášky, provozní řád, platby, objednávání obědů a jídelníček.',Z+'/pro-zaky/skolni-jidelna',async p=>{const sections=[{title:'Stravování a kontakty',blocks:[...blocksFrom(p.content,Z).filter(b=>b.type!=='list'),{type:'paragraph',text:'Telefon: 499 888 137'},{type:'paragraph',text:'E-mail: jidelna@zsrtyne.cz'}]}],attachments=[],source_urls=[];for(const a of p.content.querySelectorAll('a[href]')){const url=safeSource(a.getAttribute('href'),Z);if(!url?.startsWith(Z+'/pro-zaky/skolni-jidelna/'))continue;const sub=await page(url),title=tidy(a.textContent);source_urls.push(url);const docs=documents(sub.content,Z,title);attachments.push(...docs);if(!docs.length)sections.push({title,blocks:blocksFrom(sub.content,Z)});}return {sections,attachments,source_urls,menu_kind:'school'};}],
 ['jidelna-ms','Jídelna mateřské školy','Odhlašování stravy, kontakty, platný řád, přihláška a jídelníček MŠ.',M+'/skolni-jidelna',async p=>{const downloads=await page(M+'/ke-stazeni');const latest=documents(downloads.content,M).filter(d=>/vnitřní řád školní jídelny|přihláška ke stravování|alergeny|pestrost pokrmů/i.test(d.title));return {sections:[{title:'Stravování a odhlašování',blocks:blocksFrom(p.content,M).map(b=>b.type==='list'?{...b,items:b.items.filter(t=>!/^Denní stravné|^Kuchařky:/.test(t))}:b)},{title:'Platný ceník a pravidla',blocks:[{type:'paragraph',text:'Stránka jídelny obsahuje starší ceník a řád z roku 2022. Přednost má novější vnitřní řád zveřejněný v dokumentech školy. Ceny, úhrady i odhlašování najdete v jeho úplném textu níže.'}]}],attachments:latest,source_urls:[M+'/ke-stazeni'],menu_kind:'preschool'};}],
 ['druzina','Školní družina','Provoz, poplatek, oddělení, přihlašování a pravidla o prázdninách.',Z+'/pro-zaky/skolni-druzina',async p=>({blocks:blocksFrom(p.content,Z)})],
 ['skolni-rok','Organizace školního roku','Všechny školní prázdniny, vysvědčení a zahájení i konec vyučování.',Z+'/pro-zaky/organizace-skolniho-roku',async p=>({blocks:[{type:'heading',level:2,text:'Prázdniny ve Rtyni – okres Trutnov'},{type:'table',rows:parseSchoolHolidays(p.content).map(h=>[h.name,h.start===h.end?displayDate(h.start):displayDate(h.start)+' – '+displayDate(h.end)])},{type:'heading',level:2,text:'Další důležité termíny'},...blocksFrom(p.content,Z).filter(b=>!/prázdniny/i.test(b.text||''))],holidays:parseSchoolHolidays(p.content),school_year:tidy(p.doc.querySelector('.entry-title')?.textContent).match(/20\d{2}\s*\/\s*\d{2,4}/)?.[0]||''})],
 ['vak','Vodárny a kanalizace – VAK','Havarijní linka, kontakty, zákaznické hodiny a sídlo vodáren.',V+'/kontakt',async p=>{const raw=blocksFrom(p.content,V),txt=tidy(p.content.textContent),footer=tidy(p.doc.querySelector('footer')?.textContent||p.doc.body.textContent.slice(p.doc.body.textContent.indexOf('Za lékárnou')));const contacts=raw.filter(b=>b.type==='paragraph'&&/Telefon:/.test(b.text)).map(b=>{const [who,rest]=b.text.split('Telefon:'),phone=rest.match(/\d{3}\s*\d{3}\s*\d{3}/)?.[0],email=rest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];return {type:'contact',role:who.includes('havarijní')?'Nepřetržitá havarijní služba':who.split(' - ')[1]?.trim()||'Kontakt',name:who.includes('havarijní')?'VAK Rtyně':who.split(' - ')[0].trim(),phone,...(email?{email}:{})};});const hours=raw.filter(b=>b.type==='paragraph'&&/^(Pondělí|Středa):/.test(b.text));const facts=raw.find(b=>b.type==='paragraph'&&b.text.startsWith('Obchodní jméno:'))?.text||'';const fields=[...facts.matchAll(/(Obchodní jméno|Sídlo|Právní forma|IČ|DIČ|Datová schránka):\s*/g)];const details=fields.map((m,i)=>({type:'paragraph',text:(m[1]==='Sídlo'?'Adresa':m[1]==='IČ'?'IČO':m[1])+': '+facts.slice(m.index+m[0].length,fields[i+1]?.index??facts.length).trim()}));return {sections:[{title:'Havarijní služba a kontakty',blocks:contacts},{title:'Otevírací doba pro zákazníky',blocks:hours},...(txt.includes('16:30')&&footer.includes('16:00')?[{title:'Upřesnění zákaznických hodin',blocks:[{type:'paragraph',text:'Kontaktní stránka uvádí konec zákaznické doby v 16:30, patička téhož webu v 16:00. Příchod po 16. hodině si předem potvrďte na 499 888 155.'}]}]:[]),{title:'Sídlo a základní informace',blocks:details}]};}]

 ];
 await Promise.all(definitions.map(async([slug,title,summary,url,build])=>{const id='info-'+slug,old=previous.items?.find(x=>x.id===id);try{const p=await page(url),payload=await build(p);payload.kind='service';payload.in_latest=false;payload.local_practical=true;payload.source_urls=[url,...(payload.source_urls||[])];payload.checked_at=now;payload.source_status='ok';const oldDocs=old?.payload?.attachments||[];if(payload.attachments)payload.attachments=await Promise.all(payload.attachments.map(d=>enrichDocument(d,oldDocs)));if(slug==='jidelna-ms'){const policy=payload.attachments.find(d=>/Vnitřní řád/.test(d.title)),totals=policy?.text?.match(/Celodenní stravování\s+(\d+),--\s+(\d+),--\s+(\d+),--/);if(totals&&/Kategorie\s+2[-–]3\s+roky/.test(policy.text)&&/Kategorie\s+4[-–]6\s+let/.test(policy.text)&&/Kategorie\s+7\s*[-–]\s*10\s+let/.test(policy.text))payload.sections[1].blocks.unshift({type:'table',rows:[['Věk dítěte','Celodenní stravování'],['2–3 roky',totals[1]+' Kč'],['4–6 let',totals[2]+' Kč'],['7–10 let',totals[3]+' Kč']]});}items.push({id,source_key:'services',title,summary,category:'Praktické informace',external_url:url,last_seen_at:now,payload});}catch(e){errors.push(slug+': '+e.message);if(old)items.push({...old,payload:{...old.payload,source_status:'error',attempted_at:now}});}}));
 if(items.length<definitions.length)throw Error('Missing initial cards: '+errors.join('; '));
 items.sort((a,b)=>definitions.findIndex(d=>a.id==='info-'+d[0])-definitions.findIndex(d=>b.id==='info-'+d[0]));
 await writeFile(output,JSON.stringify({updated_at:now,items},null,2)+'\n');console.log('Practical information: '+items.length+' cards, '+items.reduce((n,x)=>n+(x.payload.attachments?.length||0),0)+' documents.');if(errors.length)console.warn(errors.join('\n'));
}
if(process.argv[1]&&pathToFileURL(fileURLToPath(pathToFileURL(process.argv[1]))).href===import.meta.url)await update();
