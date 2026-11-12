export const sections=['akce','hlavni-zpravy','prehled','omezeni','prakticke','inzerce','rozhlas','spolky','odber-novinek','podnety','o-nas','servis','doprava','finance','hero','pocasi','rychle-odjezdy'];
export function routeKey(value){
 if(typeof value!=='string'||value.length>240||!value.startsWith('/')||value.startsWith('//'))return null;
 const u=new URL(value,'https://prortyni.cz');if(!['/','/zpravy/','/inzerce/','/bydleni/','/novinky/','/odjezdy/','/jidelnicky/','/finance/'].includes(u.pathname))return null;
 const key=u.pathname==='/'?(u.searchParams.has('zprava')?'zprava':u.searchParams.has('prispevek')?'prispevek':null):u.pathname==='/zpravy/'?'clanek':u.pathname==='/inzerce/'?'inzerat':null;
 if(key&&u.searchParams.has(key)){const id=u.searchParams.get(key);if(!/^[\p{L}\p{N}_-]{1,120}$/u.test(id))return null;return u.pathname+'?'+key+'='+encodeURIComponent(id);}
 return u.pathname;
}
const events=new Set(['page_view','section_view','section_click','engaged','detail_click','more_click','filter_use','contact_click','newsletter_open','form_start','hero_click','external_click']);
export function cleanBatch(raw){
 if(!raw||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(raw.page||'')||!Array.isArray(raw.events)||raw.events.length<1||raw.events.length>20)throw Error('Neplatná data.');
 const route=routeKey(raw.route);if(!route)throw Error('Neplatná stránka.');
 const device=['mobile','tablet','desktop'].includes(raw.device)?raw.device:'desktop';
 const source=['direct','internal','facebook','google','seznam','instagram','other'].includes(raw.source)?raw.source:'other';
 const rows=raw.events.map(e=>{if(!events.has(e?.event))throw Error('Neplatná událost.');let target=e.target||'';
 if(e.event==='page_view')target='';
 else if(['detail_click','hero_click'].includes(e.event)){target=routeKey(target);if(!target)throw Error('Neplatný odkaz.');}
 else if(e.event==='engaged'){if(!['15','30','60','120','300'].includes(target))throw Error('Neplatná doba.');}
 else if(e.event==='filter_use'){if(!/^(topic|period|news|market):[a-z_-]{1,30}$/.test(target))throw Error('Neplatný filtr.');}
 else if(e.event==='form_start'){if(!['market','newsletter','suggestion'].includes(target))throw Error('Neplatný formulář.');}
 else if(e.event==='contact_click'){if(!['market','portal'].includes(target))throw Error('Neplatný kontakt.');}
 else if(e.event==='newsletter_open')target='newsletter';
 else if(!sections.includes(target))throw Error('Neplatná sekce.');
 return {event:e.event,target};});
 return{page:raw.page.toLowerCase(),route,device,source,events:[...new Map(rows.map(e=>[e.event+'|'+e.target,e])).values()]};
}
export function reportRange(from,to,now=new Date()){
 const today=now.toLocaleDateString('en-CA',{timeZone:'Europe/Prague'});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||''))throw Error('Vyberte platné období.');
 const a=Date.parse(from+'T00:00:00Z'),b=Date.parse(to+'T00:00:00Z');const days=Math.round((b-a)/86400000)+1;
 if(!Number.isFinite(a)||!Number.isFinite(b)||new Date(a).toISOString().slice(0,10)!==from||new Date(b).toISOString().slice(0,10)!==to||days<1||days>93||to>today||a<Date.parse(today)-399*86400000)throw Error('Období může mít nejvýše 93 dní a nesmí být v budoucnosti.');
 return{from,to,previousFrom:new Date(a-days*86400000).toISOString().slice(0,10),previousTo:new Date(a-86400000).toISOString().slice(0,10),days};
}
