// Public IREDO departure boards, the same read endpoints used by iredo.online.
// No timetable extrapolation: the provider covers the next two hours only.
export const STOPS = [
 {id:'K-5457440',kind:'train',name:'Rtyně v Podkrkonoší'},
 {id:'K-5457460',kind:'train',name:'Rtyně v Podkrkonoší zastávka'},
 {id:'S-30377',kind:'bus',name:'Rtyně v Podkr., aut. st.'},
 {id:'S-30382',kind:'bus',name:'Rtyně v Podkr., Kampelička'},
 {id:'S-30381',kind:'bus',name:'Rtyně v Podkr., Kostelecká'},
 {id:'S-30380',kind:'bus',name:'Rtyně v Podkr., Pančák'},
 {id:'S-20189',kind:'bus',name:'Rtyně v Podkr., Tmavý Důl'},
 {id:'S-30378',kind:'bus',name:'Rtyně v Podkr., u kříže'},
 {id:'S-30379',kind:'bus',name:'Rtyně v Podkr., u mlýna'}
];
const parts = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function localStamp(ms){const p=Object.fromEntries(parts.formatToParts(ms).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;}
export function pragueInstant(value){
 if(typeof value!=='string')return NaN;
 if(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))return Date.parse(value);
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value))return NaN;
 const base=Date.parse(value+'Z');
 const matches=[base-3600000,base-7200000].filter(t=>localStamp(t)===value);
 // A repeated autumn hour without an offset is ambiguous; never guess.
 return matches.length===1?matches[0]:NaN;
}
const key=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clean=s=>typeof s==='string'?s.replace(/,{2,}/g,', ').replace(/,\s*,/g,',').trim().slice(0,180):'';
export function normalizeDepartures(raw,stop,now=Date.now()){
 if(!Array.isArray(raw)||raw.length>200||raw.some(d=>d?.crE))throw Error('Invalid departure board');
 const seen=new Set();const departures=[];
 for(const d of raw){
  if(!d||d.sourceType!==(stop.kind==='train'?'K':'S'))continue;
  const direction=clean(d.destStation),scheduled=pragueInstant(d.depTime);
  const delay=typeof d.delay==='number'&&Number.isInteger(d.delay)&&d.delay>=0&&d.delay<=240?d.delay:null;
  const expected=scheduled+(delay??0)*60000;
  // Terminal arrivals appear in the upstream departure list too.
  if(!direction||key(direction)===key(stop.name)||!Number.isFinite(scheduled)||expected<now||scheduled>now+2*3600000||scheduled<now-4*3600000)continue;
  const id=String(d.id||'').slice(0,100),unique=id+'|'+scheduled;
  if(seen.has(unique))continue;seen.add(unique);
  departures.push({id,direction,scheduled_at:new Date(scheduled).toISOString(),expected_at:new Date(expected).toISOString(),delay_minutes:delay,line:clean(d.name||d.extLineName||String(d.lineNumber||'')),platform:clean(d.platform),detour:d.isDetour===true});
 }
 return departures.sort((a,b)=>Date.parse(a.expected_at)-Date.parse(b.expected_at)).slice(0,12);
}
const cache=new Map(),pending=new Map();
async function board(stop){
 const existing=cache.get(stop.id);
 if(existing&&Date.now()-Date.parse(existing.fetched_at)<25000)return existing;
 if(pending.has(stop.id))return pending.get(stop.id);
 const task=(async()=>{
  const source_url='https://iredo.online/departures/'+stop.id;
  try{
   const r=await fetch('https://iredo.online/crws/departures/'+stop.id+'?maxCount=20&langId=1',{signal:AbortSignal.timeout(6500),headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('Departure source unavailable');
   const raw=await r.json(),now=Date.now(),departures=normalizeDepartures(raw,stop,now);
   const result={...stop,source_url,status:'ok',fetched_at:new Date(now).toISOString(),expires_at:new Date(now+120000).toISOString(),horizon_minutes:120,departures};
   cache.set(stop.id,result);return result;
  }catch{return {...stop,source_url,status:'unavailable',fetched_at:null,expires_at:null,horizon_minutes:120,departures:[]};}
 })();
 pending.set(stop.id,task);try{return await task;}finally{pending.delete(stop.id);}
}
export async function transportInfo(params){
 const train=STOPS.find(s=>s.kind==='train'&&s.id===(params.get('train')||'K-5457440'));
 const bus=STOPS.find(s=>s.kind==='bus'&&s.id===(params.get('bus')||'S-30377'));
 if(!train||!bus)return {error:'Neplatná zastávka'};
 const boards=await Promise.all([board(train),board(bus)]);
 return {generated_at:new Date().toISOString(),stops:STOPS,boards};
}
