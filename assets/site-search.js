import {fetchDoctorAnnouncements} from './doctor-data.js?v=20261109-1';
const API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api';
const REST='https://dvbaihwplzwljxrtkymi.supabase.co/rest/v1/obcane_posts?select=id,title,slug,excerpt,body,category,source_name,published_at&status=eq.published&order=published_at.desc&limit=100';
const KEY='sb_publishable_8Lr9Tnh1CnrB_ra6VCYrZQ_C4WDZ4l3';
export const normal=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const contentKeys=new Set(['title','text','name','label','summary','body','blocks','sections','items','rows','contacts','description','address','phone','email','fees','opening_hours','activities','location','days','soup','meals','preschool_days']);
const text=value=>Array.isArray(value)?value.map(text).join(' '):value&&typeof value==='object'?Object.entries(value).filter(([key])=>contentKeys.has(key)).map(([,v])=>text(v)).join(' '):typeof value==='string'?value:'';
const sections=[['obsah','Úvod portálu Pro Rtyni','O portálu','Místní informační portál Občané pro Rtyni.'],['akce','Kalendář akcí','Akce','Koncerty, kultura a akce ve Rtyni.'],['servis','Jídelníčky ZŠ a MŠ','Praktické informace','Obědy, jídelna, školní a školkový jídelníček.'],['doprava','Odjezdy vlaků a autobusů','Doprava','Vlaky, autobusy, zastávky, zpoždění a jízdní řády.'],['omezeni','Odstávky a omezení','Praktické informace','Voda, elektřina, doprava a uzavírky.'],['aktuality-lekaru','Aktuality z ordinací','Lékaři','Dovolená, zastupování, změny ordinační doby a očkování.'],['prehled','Zprávy z našeho města','Zprávy','Aktuální zprávy z místních webů.'],['hlavni-zpravy','Hlavní zprávy','Zprávy','Vlastní články a Rtyně v médiích.'],['spolky','Spolky a sportovní oddíly','Spolky','Sport, kroužky, organizace a volný čas.'],['prakticke','Praktické informace a kontakty','Praktické informace','Lékaři, lékárna, skládka, odpady, úřad a služby.'],['podnety','Podněty pro Rtyni','Kontakt','Napište nápad nebo požadavek.'],['finance','Veřejné finance města','Finance','Rozpočet, investice a hospodaření.'],['o-nas','Kdo za portálem stojí','Kontakt','Pavel Míl, Miluše Pavlová, telefon a e-mail.']];
export function buildSearchIndex(feed={},articles=[],doctors=[],pageText={}){
 const rows=sections.map(([id,title,category,body])=>({title,category,body:body+' '+(pageText[id]||''),href:'/#'+id}));
 for(const x of feed.items||[]){if(!x.title||!x.id||x.payload?.kind==='club'&&x.payload?.in_latest===false)continue;rows.push({title:x.title,category:x.payload?.kind==='club'?'Spolky':x.payload?.kind==='service'?'Praktické informace':x.payload?.kind==='event'?'Akce':x.category||'Zprávy',body:[x.summary,text(x.payload),x.event_date].filter(Boolean).join(' '),href:'/?'+(x.source_key==='editorial'?'prispevek=':'zprava=')+encodeURIComponent(x.id)});}
 for(const x of feed.events||[])rows.push({title:x.title,category:'Akce',body:[x.description,x.location,x.starts_at].join(' '),href:'/#akce'});
 for(const x of feed.finances||[])rows.push({title:x.title,category:'Finance',body:[x.explanation,x.year,x.amount_czk].join(' '),href:'/#finance'});
 const posts=new Map();for(const x of [...(feed.posts||[]),...articles]){if(x?.id||x?.slug)posts.set(x.slug||String(x.id),x);}
 for(const x of posts.values())if(x.title)rows.push({title:x.title,category:'Hlavní zprávy',body:[x.excerpt,x.body,x.source_name].filter(Boolean).join(' '),href:'/zpravy/?clanek='+encodeURIComponent(x.slug||x.id)});
 for(const doctor of doctors)if(doctor.notices?.length)rows.push({title:doctor.name+' – Aktuality a ordinační hodiny',category:'Lékaři',body:doctor.notices.map(n=>n.text).join(' '),href:'/?zprava=280#ordinace-'+doctor.id});
 return rows.map(r=>({...r,titleKey:normal(r.title),bodyKey:normal(r.body),categoryKey:normal(r.category)}));
}
export function searchIndex(rows,query){
 const words=normal(query).split(' ').filter(Boolean);if(!words.length)return [];
 return rows.map(row=>{if(!words.every(w=>(row.titleKey+' '+row.categoryKey+' '+row.bodyKey).includes(w)))return null;return {...row,score:words.reduce((s,w)=>s+(row.titleKey.includes(w)?10:row.categoryKey.includes(w)?4:1),0)+(row.titleKey===normal(query)?20:0)};}).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'cs'));
}
const make=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
let feed=null,articles=[],doctorRows=[],pageText={},loading=null,partial=false,index=[];
function reindex(){index=buildSearchIndex(feed||{},articles,doctorRows,pageText);}
async function load(){
 if(loading)return loading;
 loading=(async()=>{
  const json=async(url,opts={})=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000),...opts});if(!r.ok)throw Error();return r.json();};
  const results=await Promise.allSettled([
   feed?Promise.resolve(feed):json(API).catch(()=>{partial=true;return json('/data/public-feed.json');}),
   json('/data/editorial-news.json').then(d=>d.articles||[]),
   json(REST,{headers:{apikey:KEY}}),
   fetchDoctorAnnouncements().then(d=>d.doctors||[]),
   fetch('/',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error();return r.text();}).then(html=>{const doc=new DOMParser().parseFromString(html,'text/html');return Object.fromEntries(sections.map(([id])=>[id,(id==='obsah'?doc.querySelector('.intro-banner'):doc.getElementById(id))?.textContent||'']));})
  ]);
  for(let i=0;i<results.length;i++){const r=results[i];if(r.status!=='fulfilled'){partial=true;continue;}if(i===0)feed=r.value;else if(i===1)articles=[...r.value,...articles];else if(i===2)articles=[...articles,...r.value];else if(i===3)doctorRows=r.value;else pageText=r.value;}
  reindex();
 })();return loading;
}
if(typeof document!=='undefined'){
 const form=document.getElementById('site-search-form'),input=document.getElementById('site-search-input'),panel=document.getElementById('site-search-results');
 if(form&&input&&panel){
  let timer,ticket=0,shown=20;
  const close=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false');};
  const open=()=>{const toggle=document.querySelector('.menu-toggle');if(toggle?.getAttribute('aria-expanded')==='true')toggle.click();panel.hidden=false;input.setAttribute('aria-expanded','true');};
  async function render(){
   const q=input.value.trim(),mine=++ticket;shown=20;input.setAttribute('aria-busy','false');panel.replaceChildren();open();
   const top=make('div',undefined,'site-search-top'),status=make('p',q.length<2?'Napište alespoň 2 znaky.':'Hledáme na portálu…');status.setAttribute('role','status');const exit=make('button','Zavřít');exit.type='button';exit.onclick=()=>{close();input.focus();};top.append(status,exit);panel.append(top);
   if(q.length<2)return;
   input.setAttribute('aria-busy','true');await load();if(mine!==ticket)return;input.setAttribute('aria-busy','false');
   const found=searchIndex(index,q),list=make('div',undefined,'site-search-list'),more=make('button','Zobrazit další výsledky','site-search-more');more.type='button';
   const paint=()=>{list.replaceChildren();for(const x of found.slice(0,shown)){const a=make('a',undefined,'site-search-result');a.href=x.href;a.append(make('small',x.category),make('strong',x.title));const raw=String(x.body||'').replace(/\s+/g,' ');if(raw){const at=normal(raw).indexOf(normal(q).split(' ')[0]),start=x.titleKey.includes(normal(q))?0:Math.max(0,at-45);a.append(make('span',(start?'…':'')+raw.slice(start,start+180)+(raw.length>start+180?'…':'')));}list.append(a);}more.hidden=found.length<=shown;};
   status.textContent=found.length?'Nalezeno '+found.length+' výsledků.':'Pro tento výraz jsme nic nenašli. Zkuste jiné slovo.';panel.append(list,more);more.onclick=()=>{shown+=20;paint();};paint();
   if(partial)panel.append(make('p','Některé zdroje jsou nyní nedostupné. Výsledky mohou být neúplné.','site-search-note'));
  }
  form.addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);render();});input.addEventListener('input',()=>{clearTimeout(timer);ticket++;timer=setTimeout(render,250);});
  input.addEventListener('click',()=>{if(input.value.trim()&&panel.hidden)render();});input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();if(panel.hidden)render().then(()=>panel.querySelector('.site-search-result')?.focus());else panel.querySelector('.site-search-result')?.focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){ticket++;close();input.focus();}});
  document.addEventListener('click',e=>{if(!form.contains(e.target)&&!panel.contains(e.target))close();});panel.addEventListener('click',e=>{if(e.target.closest('a'))close();});document.querySelector('.menu-toggle')?.addEventListener('click',close);
  document.addEventListener('rtyne:feed-ready',e=>{feed=e.detail;reindex();});
  document.addEventListener('rtyne:doctor-news-ready',e=>{doctorRows=e.detail;reindex();});
 }
}
