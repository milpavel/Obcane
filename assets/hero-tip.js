import {uniqueEvents} from './events.js?v=20261111-calendar-1';
import {feedInfo} from './feed-order.js?v=20261111-calendar-1';
import {upcomingRestrictions,restrictionLabel} from './notices.js?v=20261111-office-1';
const DAY=86400000,fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function tipClock(now=new Date()){const p=Object.fromEntries(fmt.formatToParts(now).map(x=>[x.type,x.value]));return {day:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,slot:Math.floor(Date.parse(`${p.year}-${p.month}-${p.day}`)/DAY)*8+Math.floor(Number(p.hour)/3)};}
const validDay=d=>/^20\d\d-\d\d-\d\d$/.test(d||'')&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const localRoute=x=>x.hero_article?'/zpravy/?clanek='+encodeURIComponent(x.slug||x.id):'/?zprava='+encodeURIComponent(x.id);
const family=x=>['city','calendar'].includes(x.source_key)?'city':x.source_key;
function useful(x){return x&&x.id!=null&&x.title&&x.payload?.in_latest!==false&&!x.payload?.cancelled&&!x.payload?.archive&&!x.payload?.detail_error;}
export function resultScore(x){
 const explicit=String(x.payload?.result||x.payload?.score||'');if(/^\d{1,2}\s*:\s*\d{1,2}$/.test(explicit))return explicit.replace(/\s/g,'');
 const text=[x.title,x.summary,...(x.payload?.body||[])].join(' ');
 // Accents are normalized for matching; a reported time is never a score.
 const n=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),match=n.match(/(?:zvitez\w*|vyhr\w*|prohr\w*|poraz\w*|remiz\w*|skoncil\w*|vysledek|skore)[^.!?\n]{0,70}?\b(\d{1,2})\s*:\s*(\d{1,2})\b/);
 if(!match||/(?:\bv|\bod|\bdo)\s*$/.test(match[0].slice(0,match[0].search(/\b\d{1,2}\s*:/)))||+match[1]>30||+match[2]>30)return null;
 return Number(match[1])+':'+Number(match[2]);
}
function sportsResult(x){const s=[x.title,...(x.payload?.body||[]).slice(0,2)].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return ['banik','florbal','volejbal','orel','editorial'].includes(x.source_key)&&/vysledkov|zvitez|vyhr|prohr|poraz|remiz|utkani skonc|zapas skonc/.test(s);}
export function tipCandidates(feed,articles=[],now=new Date()){
 const clock=tipClock(now),items=(feed?.items||[]).filter(useful),out=[];
 const restrictions=upcomingRestrictions(items,clock.day);
 for(const x of restrictions){const r=x.payload.restriction;if(!validDay(r.start)||!validDay(r.end))continue;const days=(Date.parse(r.start)-Date.parse(clock.day))/DAY;if(days>2||r.end<clock.day)continue;out.push({item:x,type:'notice',score:105-Math.max(0,days)*10,urgent:days<=0,tag:restrictionLabel(r.kind),date:r.start,end:r.end,href:localRoute(x)});}
 for(const x of uniqueEvents(items.filter(x=>x.payload?.kind==='event'&&validDay(x.event_date)))){
  if(x.payload?.date_conflict)continue;
  const days=(Date.parse(x.event_date)-Date.parse(clock.day))/DAY;if(days<0||days>14)continue;const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.payload?.time||'')?x.payload.time:null;
  // Without a confirmed end, stop promoting an event once its start has passed.
  if(days===0&&(time?clock.time>=(x.payload?.end_time||time):clock.time>='18:00'))continue;
  out.push({item:x,type:'event',score:95-days*4,tag:'Kam vyrazit',date:x.event_date,time,href:localRoute(x)});
 }
 for(const x of [...items,...articles.filter(x=>x.category==='original').map(x=>({...x,source_key:'editorial',hero_article:true,payload:{body:[x.body||'']},summary:x.excerpt}))]){
  if(!useful(x)||x.payload?.kind==='event'||x.payload?.calendar_only||['club','service','radio','preschool_menu'].includes(x.payload?.kind)||x.payload?.days?.length||restrictions.some(r=>r.id===x.id))continue;
  const info=feedInfo(x,clock.day);if(info.expired||info.tier!==0||info.label||!x.published_at||Date.parse(x.published_at)>+now)continue;
  const age=(Date.parse(clock.day)-Date.parse(new Date(x.published_at).toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'})))/DAY;if(age<0||age>7)continue;
  const result=sportsResult(x);out.push({item:x,type:result?'result':'news',score:72-age*3+(x.hero_article?5:0),tag:result?'Výsledky sportu':x.hero_article?'Od nás':'Ze života města',result:result?resultScore(x):null,date:null,href:localRoute(x)});
 }
 return out.sort((a,b)=>b.score-a.score||String(a.item.id).localeCompare(String(b.item.id),'cs',{numeric:true}));
}
export function selectHeroTip(feed,articles=[],now=new Date()){
 const rows=tipCandidates(feed,articles,now);if(!rows.length)return null;
 const urgent=rows.filter(x=>x.urgent);if(urgent.length)return urgent[0];
 // Mix event invitations, recent sports reports and local news throughout the day.
 const slot=tipClock(now).slot,modes=['event','result','news','event'],preferred=rows.filter(x=>x.type===modes[slot%4]),candidates=preferred.length?preferred:rows;
 const groups=new Map();for(const row of candidates){const key=family(row.item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const turn=Math.floor(slot/4),pool=[...groups.values()].slice(0,4).map(group=>group[turn%group.length]);
 return pool[turn%pool.length];
}
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function renderHeroTip(root,tip){if(!root)return;const key=tip?tip.type+':'+tip.item.id:'fallback';if(root.dataset.tipKey===key)return;root.dataset.tipKey=key;
 const kicker=node('p',tip?tip.tag.toUpperCase()+' · VYBRÁNO PRO VÁS':'VÁŠ INFORMAČNÍ PORTÁL','intro-kicker'),h=node('h1',tip?.item.title||'Rtyně na jednom místě.');h.id='intro-title';
 const meta=node('p',undefined,'hero-tip-meta');if(tip?.date){const d=new Date(tip.date+'T12:00:00Z');meta.append(node('span',d.toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',weekday:'long',day:'numeric',month:'long'})+(tip.end&&tip.end!==tip.date?' – '+new Date(tip.end+'T12:00:00Z').toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'long'}):'')+(tip.time?' · '+tip.time:'')));}if(tip?.result)meta.append(node('span','Výsledek '+tip.result));if(tip?.item.payload?.location)meta.append(node('span',tip.item.payload.location));
 const report=tip?.type==='result'?(tip.item.payload?.body||[]).find(t=>typeof t==='string'&&!/[<>]/.test(t)&&/vyhr|prohr|poraz|vítěz|vitez|remíz|remiz|skonč|skonc|zisk/.test(t)):null;
 const summary=String(report||tip?.item.summary||'Aktuální zprávy, akce a praktické informace pro život ve Rtyni.').replace(/\s+/g,' ').trim();const p=node('p',summary,'intro-description');
 const a=node('a',tip?(tip.type==='event'?'Program a podrobnosti →':tip.type==='notice'?'Podrobnosti omezení →':'Přečíst zprávu →'):'Prohlédnout aktuální akce →','hero-tip-link');a.href=tip?.href||'/#akce';if(tip)a.setAttribute('aria-label',a.textContent+' '+tip.item.title);
 root.replaceChildren(kicker,h,meta,p,a);
}
export function startHeroTips(feed){const root=document.getElementById('hero-tip');if(!root)return;let articles=[];const update=()=>{if(!document.hidden&&!root.contains(document.activeElement))renderHeroTip(root,selectHeroTip(feed,articles));};update();
 fetch('/data/editorial-news.json',{cache:'no-store',signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{articles=d.articles||[];update();}).catch(()=>{});
 setInterval(update,60000);document.addEventListener('visibilitychange',update);
}
