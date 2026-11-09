import {parseHTML} from 'npm:linkedom@0.18.12';
export const doctors=[
 {id:'hartman',name:'MUDr. Jan Hartman',source_url:'https://www.doktor-rtyne.cz/jan-hartman'},
 {id:'hartmanova',name:'MUDr. Naděžda Hartmanová',source_url:'https://www.doktor-rtyne.cz/nadezda-hartmanova'}
];
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
export function noticeType(text:string){return /neordin|nebud.{0,10}ordin|(?:^|\s)dovolená(?:\s|:)|dovolen(?:ou|é)\s+(?:od|ve|v|dne)\s|zastup|zástup|ordinace pouze|zkrácen|změně.{0,20}režimu|změn.{0,20}(?:provoz|ordinační)/i.test(text)?'provoz':/očkov|vakc|chřip|beyfortus/i.test(text)?'ockovani':'informace';}
export function noticeExpired(text:string,now=new Date()){
 if(noticeType(text)!=='provoz')return false;
 const today=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}),year=Number(today.slice(0,4));
 const dates=[...text.matchAll(/\b(\d{1,2})\.\s*(\d{1,2})\.(?:\s*((?:20)?\d{2})(?!\d))?/g)].map(m=>{
  const day=Number(m[1]),month=Number(m[2]);if(day<1||day>31||month<1||month>12)return null;
  const explicit=m[3]?Number(m[3].length===2?'20'+m[3]:m[3]):null;
  const years=explicit?[explicit]:[year-1,year,year+1];
  return years.map(y=>`${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`).sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(today))-Math.abs(Date.parse(b)-Date.parse(today)))[0];
 }).filter(Boolean) as string[];
 // No date, an open-ended restriction, or an ambiguous start-only date: retain it.
 if(!dates.length||/do odvolání|až do/i.test(text)||/(?:^|\s)od\s+\d/i.test(text)&&!/(?:^|\s)do\s+\d/i.test(text))return false;
 return dates.every(d=>d<today);
}
export function parseDoctorNews(doc:any,now=new Date()){
 const heading=Array.from(doc.querySelectorAll('h2')).find((h:any)=>clean(h.textContent)==='Aktuality') as any;
 if(!heading)throw Error('Chybí oddíl Aktuality');
 const chunks:string[]=[];
 for(let next=heading.nextElementSibling;next&&next.tagName!=='H2';next=next.nextElementSibling){
  const copy=next.cloneNode(true);copy.querySelectorAll('script,style').forEach((n:any)=>n.remove());
  const flatten=(n:any):string=>{if(n.nodeType===3)return n.textContent.replace(/\s+/g,' ');if(n.nodeType!==1)return '';if(n.tagName==='BR')return '\n';return Array.from(n.childNodes).map(flatten).join('')+(/^(P|LI|TR)$/.test(n.tagName)?'\n\n':'');};
  chunks.push(flatten(copy));
 }
 const seen=new Set<string>();
 const notices=chunks.join('\n\n').split(/\n\s*\n/).map(clean).filter(t=>t.length>25&&t.length<=5000&&!/^Děkuji\s+dr\./i.test(t)).filter(t=>{if(seen.has(t)||noticeExpired(t,now))return false;seen.add(t);return true;}).map(text=>({text,kind:noticeType(text)})).sort((a,b)=>Number(b.kind==='provoz')-Number(a.kind==='provoz')).slice(0,8);
 const selected:any[]=[];let words=0;for(const notice of notices){const count=notice.text.split(/\s+/).length;if(words+count>170)continue;selected.push(notice);words+=count;}return selected;
}
let cached:any=null,until=0,pending:Promise<any>|null=null;
export async function doctorNews(){
 if(cached&&Date.now()<until)return cached;
 if(pending)return pending;
 pending=(async()=>{
  const rows=await Promise.all(doctors.map(async doctor=>{
   try{const r=await fetch(doctor.source_url,{signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error('Doctor website unavailable');const doc=parseHTML(await r.text()).document;const notices=parseDoctorNews(doc);return {...doctor,status:'ok',checked_at:new Date().toISOString(),notices};}
   catch{return {...doctor,status:'unavailable',checked_at:null,notices:[]};}
  }));
  cached={generated_at:new Date().toISOString(),doctors:rows};until=Date.now()+(rows.every(d=>d.status==='ok')?600000:60000);return cached;
 })();try{return await pending;}finally{pending=null;}
}
