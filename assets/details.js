// A shared, text-only renderer for imported articles, services and directories.
const junk=/^(?:Dlaždice|Text stránky|Text složky|Text rubriky|Dokumenty|Přílohy|Náplň činnosti|Odkazy|ukázat na mapě)$/i;
export function cleanDetailText(value){return String(value||'').replace(/\s+/g,' ').trim().replace(/^(?:Text stránky|Text složky|Text rubriky|Náplň činnosti)\s*/i,'').trim();}
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function documentPreviewURL(value){try{const u=new URL(value,'https://prortyni.cz');const id=u.hostname==='www.rtyne.cz'&&u.protocol==='https:'&&u.pathname.match(/^\/file\/(\d{1,12})$/)?.[1];return id?'https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api?document='+id:value;}catch{return value;}}
function safeURL(value){try{const u=new URL(value,'https://prortyni.cz');return ['https:','http:','mailto:','tel:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function linkedText(target,value,links=[]){
 const text=cleanDetailText(value),matches=[...text.matchAll(/https?:\/\/[^\s<>]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+420\s*)?\b\d{3}[ \u00a0]?\d{3}[ \u00a0]?\d{3}\b(?!\s*\/)/gi)];let start=0;
 for(const m of matches){target.append(document.createTextNode(text.slice(start,m.index)));const href=m[0].includes('@')?'mailto:'+m[0]:/^https?:/.test(m[0])?m[0]:'tel:'+m[0].replace(/\s/g,'');const a=node('a',m[0]);a.href=safeURL(href)||'#';if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}target.append(a);start=m.index+m[0].length;}target.append(document.createTextNode(text.slice(start)));
 for(const ref of links){if(!ref.text||text.includes(ref.url)||matches.some(m=>m[0]===ref.text))continue;const href=safeURL(ref.url);if(!href)continue;const a=node('a',ref.text+' ↗','detail-inline-link');a.href=href;if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}target.append(a);}
 return target;
}
export function fallbackBlocks(lines=[]){return lines.map(cleanDetailText).filter(t=>t&&!junk.test(t)).map(text=>{
 if(/^##?\s/.test(text))return {type:'heading',level:2,text:text.replace(/^##?\s/,'')};
 if(/^(?:MUDr\.|LÉKÁRNA )/i.test(text)&&text.length<85)return {type:'heading',level:2,text};
 if(/^(Ordinační hodiny|Otevírací doba|Kontakt|Adresa|Smluvní pojišťovny|Bankovní spojení)$/i.test(text))return {type:'heading',level:3,text};
 if(/1213[-–]15/.test(text))text='Ordinační hodiny od pondělí do středy nejsou na webu města jednoznačně zapsané. Potvrďte si je prosím telefonicky v ordinaci.';
 return {type:'paragraph',text};
 });}
function hourRow(text){
 const day='(?:Po(?:ndělí)?|Út(?:erý)?|St(?:ředa)?|Čt(?:vrtek)?|Pá(?:tek)?|Sobota|Neděle)';
 const pattern=new RegExp('^('+day+'(?:\\s*(?:,|[-–])\\s*'+day+')?)\\s*[:·-]?\\s+(.+)$','i'),m=text?.match(pattern);
 if(!m||!(/\d{1,2}[:.]\d{2}|zavřeno/i.test(m[2])))return null;
 const hours=m[2].replace(/\b(\d{1,2})[.](\d{2})\b/g,'$1:$2').replace(/\b(\d{1,2}) (\d{2})(?=\s|$)/g,'$1:$2').replace(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})(?![:\d])/g,'$1:00 – $2:00');
 return [m[1],hours];
}
export function landfillBlocks(blocks=[],title=''){
 if(/^Otevírací doba$/i.test(title))return blocks.flatMap(b=>{
  if(b.type!=='paragraph')return [b];
  const text=cleanDetailText(b.text),days=[...text.matchAll(/(?:^|\s)(Pondělí|Úterý|Středa|Čtvrtek|Pátek|Sobota|Neděle)\s*[-–:]\s*/gi)];
  if(days.length<2)return [b];
  const split=days.map((m,i)=>({type:'paragraph',text:m[1]+' '+text.slice(m.index+m[0].length,days[i+1]?.index??text.length).trim()}));
  return split.every(x=>hourRow(x.text))?split:[b];
 });
 if(/^Kontakty$/i.test(title))return blocks.flatMap(b=>{
  if(b.type!=='paragraph')return [b];
  const text=cleanDetailText(b.text),roles=[...text.matchAll(/(?:^|\s)(JEDNATEL|VEDOUCÍ)\s+/g)];
  if(roles.length<2)return [b];
  const contacts=roles.map((m,i)=>{
   const part=text.slice(m.index+m[0].length,roles[i+1]?.index??text.length),name=part.match(/^(.+?)\s+tel\.?\s+/i)?.[1],phone=part.match(/tel\.?\s+((?:\+420\s*)?\d{3}\s*\d{3}\s*\d{3})/i)?.[1],email=part.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
   return {type:'contact',role:m[1]==='JEDNATEL'?'Jednatel':'Vedoucí',name,phone,...(email?{email}:{})};
  });
  return contacts.every(c=>c.name&&c.phone)?contacts:[b];
 });
 return blocks;
}
export function renderBlocks(target,blocks=[]){
 let hours=null,bullets=null;
 for(const b of blocks){const text=cleanDetailText(b.text);if(junk.test(text))continue;if(b.type==='paragraph'&&/^[*•-]\s+/.test(text)){if(!bullets){bullets=node('ul',null,'detail-list');target.append(bullets);}bullets.append(linkedText(node('li'),text.replace(/^[*•-]\s+/,'')));hours=null;continue;}bullets=null;const row=b.type==='paragraph'?hourRow(text):null;
 if(row){if(!hours){hours=node('table',null,'detail-table hours-table');const caption=node('caption','Přehled hodin');hours.append(caption,node('tbody'));target.append(hours);}const tr=node('tr');tr.append(node('th',row[0]),linkedText(node('td'),row[1]));tr.firstChild.scope='row';hours.lastChild.append(tr);continue;}hours=null;
 if(b.type==='contact'){
  const card=node('article',null,'detail-contact');card.append(node('span',b.role,'eyebrow'),node('h3',b.name));
  card.append(linkedText(node('p'),'Telefon: '+b.phone));if(b.email)card.append(linkedText(node('p'),'E-mail: '+b.email));target.append(card);
 }
 else if(b.type==='heading'&&text){target.append(node(b.level===2?'h2':'h3',text));}
 else if(b.type==='table'&&Array.isArray(b.rows)){const wrap=node('div',null,'detail-table-wrap'),table=node('table',null,'detail-table');table.append(node('caption','Přehled údajů'));const tb=node('tbody');for(const values of b.rows){if(!Array.isArray(values))continue;const tr=node('tr');values.forEach((v,i)=>{const cell=linkedText(node(i===0?'th':'td'),v);if(i===0)cell.scope='row';tr.append(cell);});tb.append(tr);}table.append(tb);wrap.append(table);target.append(wrap);}
 else if(b.type==='list'&&Array.isArray(b.items)){
 const items=b.items.map(cleanDetailText).filter(t=>t&&!junk.test(t));
 if(items.length&&items.every(hourRow)){renderBlocks(target,items.map(text=>({type:'paragraph',text})));continue;}
 const insurance=items.length>2&&items.every(t=>/pojišťovn/i.test(t)),holder=insurance?node('details',null,'detail-insurance'):target;if(insurance){holder.append(node('summary','Zobrazit smluvní pojišťovny'));target.append(holder);}
 const list=node(b.ordered?'ol':'ul',null,'detail-list');for(const value of items)list.append(linkedText(node('li'),value));holder.append(list);
 }
 else if(text){const fact=text.match(/^(Telefon|Tel\.|E[ -]?mail|Sídlo pečovatelské služby|Pracovní doba|Identifikátor|Datová schránka|IČO|DIČ|Adresa|Prodejna)\s*:\s*(.+)$/i);if(fact){const box=node('div',null,'detail-fact');box.append(node('span',fact[1],'detail-fact-label'),linkedText(node('span'),fact[2],b.links||[]));target.append(box);}else target.append(linkedText(node('p'),text,b.links||[]));}
 }
}
export function renderDetailContent(body,x){const p=x.payload||{};let blocks=Array.isArray(p.blocks)?p.blocks:fallbackBlocks(p.body||[]);blocks=blocks.filter(b=>b.type!=='paragraph'||cleanDetailText(b.text)!==cleanDetailText(x.summary));renderBlocks(body,blocks);
 for(const section of p.sections||[]){body.append(node('h2',section.title));const blocks=x.external_url==='https://www.rtyne.cz/skladka-pod-haldou'?landfillBlocks(section.blocks,section.title):section.blocks;
  if(blocks?.length&&blocks.every(b=>b.type==='contact')){const grid=node('div',null,'detail-contacts-grid');renderBlocks(grid,blocks);body.append(grid);}else renderBlocks(body,blocks);
  renderAttachments(body,section.attachments);}
 if(p.service_links?.length){const section=node('details',null,'service-resources');section.append(node('summary','Další informace ke službě'));for(const ref of p.service_links){const href=safeURL(ref.url);if(!href||!/^https?:/.test(href))continue;const a=node('a',ref.title+' ↗','attachment');a.href=href;a.target='_blank';a.rel='noopener noreferrer';section.append(a);}body.append(section);}
 return blocks.length+(p.sections?.length||0);
}
export function renderAttachments(body,attachments=[]){if(!attachments?.length)return;const list=node('div',null,'detail-documents');for(const a of attachments){const href=safeURL(a.url);if(!href||!/^https?:/.test(href))continue;const title=cleanDetailText(a.title).replace(/\s+pdf\s+\d+\s*kB$/i,'');const row=node('div',null,'detail-document'),link=node('a',title+' ↗');link.href=a.url?.startsWith('/documents/')?a.url:href;link.target='_blank';link.rel='noopener noreferrer';if(a.url?.startsWith('/documents/')){link.setAttribute('download',decodeURIComponent((a.original_url||a.url).split('/').at(-1)));link.textContent='Stáhnout: '+title;}row.append(node('span',(a.type||'Soubor').toUpperCase(),'document-kind'),link);if(a.type==='pdf'&&(href.startsWith('https://prortyni.cz/documents/')||/^https:\/\/(?:www\.)?(?:rtyne|zsrtyne|msrtyne)\.cz\//.test(href))){const preview=node('details'),toggle=node('summary','Náhled dokumentu');preview.append(toggle);preview.addEventListener('toggle',()=>{if(preview.open&&!preview.querySelector('iframe')){const frame=node('iframe',null,'document-frame');frame.src=documentPreviewURL(a.url?.startsWith('/documents/')?a.url:href);frame.title=title;frame.loading='lazy';preview.append(frame);}});row.append(preview);}if(a.text){const details=node('details',null,'document-text'),toggle=node('summary','Číst obsah dokumentu zde');details.append(toggle);details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('pre'))details.append(node('pre',a.text,'document-transcript'));});row.append(details);}if(a.text_unavailable)row.append(node('p','Úplný přepis se nyní nepodařilo ověřit. Použijte originální soubor.','muted tiny'));list.append(row);}body.append(list);}
export function organizeDetail(body){
 // Keep every imported content type in the same visual system.
 let section=null;const headings=[];let i=0;
 for(const child of [...body.children]){if(child.tagName==='H2'){section=node('section',null,'detail-section');section.id='detail-section-'+(++i);child.before(section);section.append(child);headings.push({text:child.textContent,id:section.id});}else if(section&&!child.matches('aside,.article-media,.service-resources'))section.append(child);else if(child.matches('aside,.article-media,.service-resources'))section=null;}
 if(headings.length>1){const nav=node('nav',null,'detail-contents');nav.setAttribute('aria-label','Obsah této stránky');nav.append(node('span','Na této stránce','eyebrow'));for(const h of headings){const a=node('a',h.text);a.href='#'+h.id;nav.append(a);}body.prepend(nav);}
}
