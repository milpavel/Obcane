// Aggregate portal usage. No cookies, persistent visitor IDs, form contents or full referrers.
import {routeKey,sections} from './statistics-rules.js?v=20261112-statistics-1';
const endpoint='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-analytics';
export function installStatistics(win=window,doc=document){
 if(win.location.hostname!=='prortyni.cz'&&win.location.hostname!=='www.prortyni.cz')return;
 if(win.navigator.webdriver||win.navigator.globalPrivacyControl||win.navigator.doNotTrack==='1')return;
 const route=routeKey(win.location.pathname+win.location.search);if(!route||/^(#sprava=|#potvrdit=|#odhlasit=)/.test(win.location.hash))return;
 try{if(win.localStorage.getItem('prortyni-redakce-auth'))return;}catch{}
 const page=win.crypto.randomUUID(),sent=new Set(),queue=[];let pending,active=0;
 let ref='direct';try{const host=new URL(doc.referrer).hostname;if(host===win.location.hostname)ref='internal';else ref=/facebook\.|fb\.com$/.test(host)?'facebook':/google\./.test(host)?'google':/seznam\./.test(host)?'seznam':/instagram\./.test(host)?'instagram':'other';}catch{}
 const device=win.matchMedia('(max-width:700px)').matches?'mobile':win.matchMedia('(max-width:1050px)').matches?'tablet':'desktop';
 function flush(){win.clearTimeout(pending);if(!queue.length)return;const events=queue.splice(0,20),body=JSON.stringify({page,route,device,source:ref,events});try{const blob=new Blob([body],{type:'text/plain;charset=UTF-8'});if(!win.navigator.sendBeacon?.(endpoint,blob))win.fetch(endpoint,{method:'POST',body,headers:{'Content-Type':'text/plain'},keepalive:true}).catch(()=>{});}catch{}if(queue.length)pending=win.setTimeout(flush,500);}
 function track(event,target=''){if(doc.visibilityState==='hidden'||/^(#sprava=|#potvrdit=|#odhlasit=)/.test(win.location.hash))return;const key=event+'|'+target;if(sent.has(key))return;sent.add(key);queue.push({event,target});if(queue.length>=15)flush();else{win.clearTimeout(pending);pending=win.setTimeout(flush,1200);}}
 const sectionTimers=new Map(),visible=new Set();
 const observer='IntersectionObserver'in win?new win.IntersectionObserver(entries=>{for(const e of entries){const id=e.target.classList.contains('intro-banner')?'hero':e.target.id==='weather-band'?'pocasi':e.target.classList.contains('daily-transport')?'rychle-odjezdy':e.target.id,enough=e.isIntersecting&&e.intersectionRect.height>=Math.min(e.boundingClientRect.height,win.innerHeight)*.5;if(enough)visible.add(id);else visible.delete(id);win.clearTimeout(sectionTimers.get(id));if(enough)sectionTimers.set(id,win.setTimeout(()=>{if(visible.has(id)&&doc.visibilityState!=='hidden')track('section_view',id);},2000));}},{threshold:[0,.1,.25,.5,.75,1]}):null;
 for(const id of sections){const e=id==='hero'?doc.querySelector('.intro-banner'):id==='pocasi'?doc.querySelector('#weather-band'):id==='rychle-odjezdy'?doc.querySelector('.daily-transport'):doc.getElementById(id);if(e)observer?.observe(e);}
 doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='hidden'){for(const t of sectionTimers.values())win.clearTimeout(t);flush();}else{for(const id of visible)sectionTimers.set(id,win.setTimeout(()=>{if(visible.has(id))track('section_view',id);},2000));}});
 win.addEventListener('pagehide',flush);
 win.setInterval(()=>{if(doc.visibilityState==='hidden')return;if(active===0)track('page_view');active++;if([15,30,60,120,300].includes(active))track('engaged',String(active));},1000);
 const context=e=>{const section=e.closest('section[id]');if(section&&sections.includes(section.id))return section.id;if(e.closest('.intro-banner'))return'hero';return'prakticke';};
 doc.addEventListener('click',e=>{if(!e.isTrusted)return;const node=e.target.closest?.('a,button');if(!node)return;const section=context(node);
  if(node.dataset.eventTopic)track('filter_use','topic:'+node.dataset.eventTopic);
  else if(node.dataset.period)track('filter_use','period:'+node.dataset.period);
  else if(node.dataset.filter)track('filter_use','news:'+node.dataset.filter);
  if(node.closest('.load-more')||['more','events-more','radio-more','clubs-more','services-more','news-more','market-more'].includes(node.id))track('more_click',section);
  if(node.tagName!=='A')return;const href=node.getAttribute('href')||'';
  if(/^(mailto:|tel:)/.test(href)){track('contact_click',win.location.pathname==='/inzerce/'?'market':'portal');return;}
  let u;try{u=new URL(href,win.location.href);}catch{return;}
  if(u.origin!==win.location.origin){if(/^https?:/.test(u.protocol))track('external_click',section);return;}
  const target=routeKey(u.pathname+u.search);if(!target)return;
  if(target==='/novinky/')track('newsletter_open');
  if(u.hash==='#vlozit')track('form_start','market');
  if(section==='hero')track('hero_click',target);
  else if(u.searchParams.has('zprava')||u.searchParams.has('prispevek')||u.searchParams.has('clanek')||u.searchParams.has('inzerat')){track('detail_click',target);track('section_click',section);}
  if(node.closest('.market-home-links'))track('more_click','inzerce');
 });
 doc.addEventListener('focusin',e=>{const form=e.target.closest?.('form');if(!form)return;if(form.id==='suggestion-form')track('form_start','suggestion');else if(form.id==='ad-form')track('form_start','market');else if(win.location.pathname==='/novinky/')track('form_start','newsletter');});
 return{track,flush};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installStatistics();
