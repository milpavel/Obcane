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
export function renderHeroTip(root,tip,headingTag="h1",headingID="intro-title"){if(!root)return;const key=tip?tip.type+':'+tip.item.id:'fallback';if(root.dataset.tipKey===key)return;root.dataset.tipKey=key;
 const kicker=node('p',tip?tip.tag.toUpperCase()+' · VYBRÁNO PRO VÁS':'VÁŠ INFORMAČNÍ PORTÁL','intro-kicker'),h=node(headingTag,tip?.item.title||'Rtyně na jednom místě.');h.id=headingID;
 const meta=node('p',undefined,'hero-tip-meta');if(tip?.date){const d=new Date(tip.date+'T12:00:00Z');meta.append(node('span',d.toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',weekday:'long',day:'numeric',month:'long'})+(tip.end&&tip.end!==tip.date?' – '+new Date(tip.end+'T12:00:00Z').toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'long'}):'')+(tip.time?' · '+tip.time:'')));}if(tip?.result)meta.append(node('span','Výsledek '+tip.result));if(tip?.item.payload?.location)meta.append(node('span',tip.item.payload.location));
 const report=tip?.type==='result'?(tip.item.payload?.body||[]).find(t=>typeof t==='string'&&!/[<>]/.test(t)&&/vyhr|prohr|poraz|vítěz|vitez|remíz|remiz|skonč|skonc|zisk/.test(t)):null;
 const reportFallback=tip?.type==='result'?(tip.item.payload?.body||[]).find(t=>typeof t==='string'&&t.length>30&&!/[<>]/.test(t)):null;
 const summary=String(report||reportFallback||tip?.item.summary||'Aktuální zprávy, akce a praktické informace pro život ve Rtyni.').replace(/\s+/g,' ').trim();const p=node('p',summary,'intro-description');
 const a=node('a',tip?(tip.type==='event'?'Program a podrobnosti →':tip.type==='notice'?'Podrobnosti omezení →':'Přečíst zprávu →'):'Prohlédnout aktuální akce →','hero-tip-link');a.href=tip?.href||'/#akce';if(tip)a.setAttribute('aria-label',a.textContent+' '+tip.item.title);
 root.replaceChildren(kicker,h,meta,p,a);
}
export function latestMainTip(feed,articles=[],now=new Date()){
 const merged=new Map();for(const article of [...articles,...(feed?.posts||[])]){if(!article?.title||!['original','media'].includes(article.category)||(!article.id&&!article.slug)||article.status&&article.status!=='published')continue;const stamp=Date.parse(article.published_at||'');if(!Number.isFinite(stamp)||stamp>+now)continue;merged.set(article.slug||String(article.id),article);}
 // Use the same article date as the main-news section, with stable tie-breakers.
 const when=x=>x.source_date||x.published_at.slice(0,10),rows=[...merged.values()].filter(x=>validDay(when(x))).sort((a,b)=>when(b).localeCompare(when(a))||String(b.published_at).localeCompare(String(a.published_at))||String(b.id).localeCompare(String(a.id),'en',{numeric:true}));
 if(!rows.length)return null;const article=rows[0],item={...article,source_key:'editorial',hero_article:true,summary:article.excerpt||'',payload:{body:[article.body||'']}};
 return {item,type:'news',tag:'Hlavní zprávy',date:when(article),href:localRoute(item),pinned:true};
}
export function selectHeroSlides(feed,articles=[],now=new Date()){
 const rows=tipCandidates(feed,articles,now),first=selectHeroTip(feed,articles,now),pinned=latestMainTip(feed,articles,now);if(!first&&!pinned)return [];
 const chosen=pinned?[pinned]:[first];if(pinned&&first&&first.href!==pinned.href)chosen.push(first);const slot=tipClock(now).slot,turn=Math.floor(slot/4),remaining=()=>rows.filter(r=>!chosen.some(c=>c.href===r.href));
 for(const type of ['event','result','news','notice']){
  if(chosen.length===3)break;if(chosen.some(c=>c.type===type))continue;
  const pool=remaining().filter(r=>r.type===type),different=pool.filter(r=>!chosen.some(c=>family(c.item)===family(r.item))),pick=different.length?different:pool;
  if(pick.length)chosen.push(pick[turn%Math.min(pick.length,4)]);
 }
 while(chosen.length<3){const pool=remaining(),different=pool.filter(r=>!chosen.some(c=>family(c.item)===family(r.item))),pick=different.length?different:pool;if(!pick.length)break;chosen.push(pick[turn%Math.min(pick.length,4)]);}
 return chosen;
}
export function createHeroSlider(root,{reducedMotion=false}={}){
 let slides=[],active=0,paused=reducedMotion,hover=false,focused=false,timer=null,signature=null,touch=null;
 root.classList.add('hero-slider');root.setAttribute('aria-roledescription','prezentace');
 const heading=node('h1','Vybráno pro vás ve Rtyni','hero-slider-heading');heading.id='intro-title';
 const track=node('div',undefined,'hero-slides');track.setAttribute('aria-live','off');
 const controls=node('div',undefined,'hero-slider-controls'),previous=node('button','←','hero-slider-arrow'),next=node('button','→','hero-slider-arrow'),dots=node('div',undefined,'hero-slider-dots');
 previous.type=next.type='button';previous.setAttribute('aria-label','Předchozí upoutávka');next.setAttribute('aria-label','Další upoutávka');dots.setAttribute('aria-label','Výběr upoutávky');
 controls.append(previous,dots,next);root.replaceChildren(heading,track,controls);
 const stop=()=>{if(timer)clearTimeout(timer);timer=null;};
 const schedule=()=>{stop();if(slides.length>1&&!paused&&!hover&&!focused&&!document.hidden)timer=setTimeout(()=>show(active+1),10000);};
 function show(index){active=(index+slides.length)%slides.length;for(const [i,slide]of [...track.children].entries()){slide.hidden=i!==active;dots.children[i].setAttribute('aria-current',String(i===active));}schedule();}
 previous.onclick=()=>show(active-1);next.onclick=()=>show(active+1);
 root.addEventListener('pointerenter',()=>{hover=true;stop();});root.addEventListener('pointerleave',()=>{hover=false;schedule();});
 root.addEventListener('focusin',()=>{focused=true;stop();});root.addEventListener('focusout',e=>{focused=root.contains(e.relatedTarget);schedule();});
 root.addEventListener('touchstart',e=>{touch=e.touches?.[0]?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;stop();},{passive:true});
 root.addEventListener('touchend',e=>{const p=e.changedTouches?.[0];if(touch&&p&&Math.abs(p.clientX-touch.x)>50&&Math.abs(p.clientY-touch.y)<40)show(active+(p.clientX<touch.x?1:-1));touch=null;schedule();},{passive:true});
 document.addEventListener('visibilitychange',schedule);
 return {setTips(tips){if(focused||hover)return;const key=tips.map(t=>t.href+':'+t.date+':'+t.time).join('|');if(key===signature)return;signature=key;const old=slides[active]?.href;slides=tips.length?tips:[null];active=Math.max(0,slides.findIndex(t=>t?.href===old));track.replaceChildren();dots.replaceChildren();
  for(const [i,tip]of slides.entries()){const slide=node('div',undefined,'hero-slide');slide.id='hero-slide-'+(i+1);slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','snímek');slide.setAttribute('aria-label',(i+1)+' ze '+slides.length);renderHeroTip(slide,tip,'h2','hero-slide-title-'+(i+1));track.append(slide);const dot=node('button',String(i+1),'hero-slider-dot');dot.type='button';dot.setAttribute('aria-label','Zobrazit upoutávku '+(i+1)+(tip?': '+tip.item.title:''));dot.setAttribute('aria-controls',slide.id);dot.onclick=()=>show(i);dots.append(dot);}
  controls.hidden=slides.length<2;show(active);
 },getState(){return {active,count:slides.length,paused};}};
}
export function startHeroTips(feed){const root=document.getElementById('hero-tip');if(!root)return;let articles=[],currentFeed=feed;const slider=createHeroSlider(root,{reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches});const update=()=>{if(!document.hidden)slider.setTips(selectHeroSlides(currentFeed,articles));};update();
 fetch('/data/editorial-news.json',{cache:'no-store',signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{articles=d.articles||[];update();}).catch(()=>{});
 setInterval(update,60000);document.addEventListener('visibilitychange',update);
 const refresh=async()=>{if(document.hidden)return;try{const r=await fetch('https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(r.ok){const next=await r.json();if(Array.isArray(next.items))currentFeed=next;}}catch{}try{const r=await fetch('/data/editorial-news.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(r.ok){const next=await r.json();if(Array.isArray(next.articles))articles=next.articles;}}catch{}update();};
 setInterval(refresh,15*60000);
}
