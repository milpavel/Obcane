import {uniqueEvents} from './events.js?v=20261111-feed-1';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const DAY=86400000,months=['ledna','unora','brezna','dubna','kvetna','cervna','cervence','srpna','zari','rijna','listopadu','prosince'];
function day(value){const d=String(value||'').slice(0,10);return /^20\d\d-\d\d-\d\d$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d?d:null;}
function published(x){const value=x.published_at;if(!value||!Number.isFinite(Date.parse(value)))return null;return day(new Date(value).toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}));}
function explicitDates(value){const out=[],s=norm(value),iso=(d,m,y)=>day(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);for(const m of s.matchAll(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/g)){const d=iso(m[1],m[2],m[3]);if(d)out.push(d);}for(const m of s.matchAll(/\b(\d{1,2})\.\s*(ledna|unora|brezna|dubna|kvetna|cervna|cervence|srpna|zari|rijna|listopadu|prosince)\s+(20\d{2})\b/g)){const d=iso(m[1],months.indexOf(m[2])+1,m[3]);if(d)out.push(d);}return [...new Set(out)].sort();}
export function feedInfo(x,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'})){
 const p=x.payload||{},pub=published(x),title=norm(x.title),intro=norm([x.title,x.summary,...(p.body||[]).slice(0,2)].join(' '));
 const retrospective=/zaznam|vysledkov|ohlednuti|fotogaler|fotografie|podekovani|vitezne|zname viteze|probeh[lno]|uskutecnil|konal[aoiy]/.test(title)||/probehla|uskutecnilo se|se konal[ao]/.test(intro.slice(0,350));
 const invitation=/pozvank|zveme|zve\b|prijd|uskutecni|bude|kona se|hraji|fotografovani|prazdniny|reditelske volno|svoz|uzavren|zavreno/.test(intro);
 let start=day(x.event_date)||explicitDates(x.title)[0],end=day(p.end_date||p.event_end_date||p.restriction?.end),knownEvent=!!start;
 if(!start&&!retrospective&&invitation){const content=[x.title,x.summary,...(p.body||[]).slice(0,2)].join(' '),dates=explicitDates(content);if(!dates.length&&pub){const found=content.match(/\b(\d{1,2})\.\s*(\d{1,2})\.(?!\s*\d{4})/);if(found){const year=Number(pub.slice(0,4)),possible=[year-1,year,year+1].map(y=>day(`${y}-${found[2].padStart(2,'0')}-${found[1].padStart(2,'0')}`)).filter(Boolean).sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(pub))-Math.abs(Date.parse(b)-Date.parse(pub)));if(possible[0]&&Math.abs(Date.parse(possible[0])-Date.parse(pub))<=183*DAY)dates.push(possible[0]);}}start=dates[0]||null;end=start;knownEvent=!!start;}
 end=end&&(!start||end>=start)?end:start;
 const report=retrospective||knownEvent&&pub&&pub>end&&!invitation;
 const age=pub?Math.max(0,(Date.parse(today)-Date.parse(pub))/DAY):null;
 if(p.cancelled||p.archive)return {tier:2,score:pub||end||'',label:p.cancelled?'Zrušená akce':'Archiv',date:end||pub,expired:!!end&&end<today};
 if(knownEvent&&!report){const distance=(Date.parse(start)-Date.parse(today))/DAY;if(end<today)return {tier:2,score:end,label:p.restriction?'Omezení již skončilo':'Akce již proběhla',date:end,expired:true};return {tier:distance<=14?0:1,score:100-Math.max(0,distance),label:start===today?'Dnes':start<today?'Právě probíhá':'Připravuje se',date:start,expired:false};}
 if(report&&end&&(Date.parse(today)-Date.parse(end))/DAY>30)return {tier:2,score:end,label:'Starší událost',date:end,expired:false};
 if(pub&&pub<=today)return {tier:age<=14?0:age<=30?1:2,score:age<=30?100-age:pub,label:age>30?'Starší zpráva':'',date:pub,expired:false};
 return {tier:3,score:'',label:pub?'Datum zveřejnění je v budoucnosti':'Datum neuvedeno',date:pub,expired:false};
}
const family=x=>['city','calendar'].includes(x.source_key)?'city':x.source_key||'unknown';
export function orderFeed(items,{today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}),diverse=true}={}){
 // Deduplicate invitations across sources; retain their original source references.
 const eventRows=items.filter(x=>day(x.event_date)&&x.payload?.kind!=='club');
 const eventIDs=new Set(eventRows.map(x=>x.id));
 const candidates=[...items.filter(x=>!eventIDs.has(x.id)),...uniqueEvents(eventRows)];
 const rows=candidates.map(x=>({x,info:feedInfo(x,today)})).sort((a,b)=>a.info.tier-b.info.tier||(typeof a.info.score==='number'&&typeof b.info.score==='number'?b.info.score-a.info.score:String(b.info.score).localeCompare(String(a.info.score)))||String(b.x.published_at||'').localeCompare(String(a.x.published_at||''))||String(a.x.id).localeCompare(String(b.x.id),'en',{numeric:true}));
 if(!diverse)return rows.map(r=>r.x);
 const out=[];let used=new Map();
 while(rows.length){if(out.length%6===0)used=new Map();const tier=rows[0].info.tier;let pool=rows.map((r,i)=>({r,i})).filter(({r})=>r.info.tier===tier);const under=pool.filter(({r})=>(used.get(family(r.x))||0)<2);if(under.length)pool=under;const other=pool.filter(({r})=>family(r.x)!==family(out.at(-1)||{}));if(other.length)pool=other;const index=pool[0].i,[next]=rows.splice(index,1);out.push(next.x);used.set(family(next.x),(used.get(family(next.x))||0)+1);}
 return out;
}
