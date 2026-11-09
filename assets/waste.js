const isoNow=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});
const dateLabel=value=>new Date(value+'T12:00:00Z').toLocaleDateString('cs-CZ',{day:'numeric',month:'long'});
export function nextCollections(data,today=isoNow()){
 const calendar=data?.calendars?.find(c=>String(c.year)===today.slice(0,4)&&c.valid_until>=today);
 if(!calendar)return {bio:null,communal:null,calendar:null};
 const valid=d=>/^20\d{2}-\d{2}-\d{2}$/.test(d)&&d.startsWith(String(calendar.year)+'-');
 const bio=[...new Set((calendar.bio||[]).filter(valid))].sort().find(d=>d>=today)||null;
 const days=[...new Set((calendar.communal||[]).filter(valid))].sort(),periods=[];
 for(const day of days){const last=periods.at(-1);if(last&&Date.parse(day+'T12:00:00Z')-Date.parse(last.end+'T12:00:00Z')===86400000)last.end=day;else periods.push({start:day,end:day});}
 return {bio,communal:periods.find(p=>p.end>=today)||null,calendar};
}
export function collectionLabel(start,end=start,today=isoNow()){
 if(!start)return 'Termín zatím není zveřejněný';
 if(start===end){if(start===today)return 'Dnes · '+dateLabel(start);return dateLabel(start);}
 const a=new Date(start+'T12:00:00Z'),b=new Date(end+'T12:00:00Z');const label=a.getUTCMonth()===b.getUTCMonth()?a.getUTCDate()+'.–'+dateLabel(end):dateLabel(start)+' – '+dateLabel(end);return start<=today&&end>=today?'Probíhá · '+label:label;
}
export function renderCollections(data,today=isoNow()){
 const bio=document.getElementById('waste-bio'),communal=document.getElementById('waste-communal');if(!bio||!communal)return;
 const next=nextCollections(data,today);bio.textContent=next.calendar?collectionLabel(next.bio,undefined,today):'Čekáme na nový kalendář';communal.textContent=next.calendar?collectionLabel(next.communal?.start,next.communal?.end,today):'Čekáme na nový kalendář';
 const source=document.getElementById('waste-source');source.href=next.calendar?.source_url||'/?zprava=277';source.textContent=next.calendar?'Kalendář města '+next.calendar.year+' ↗':'Svozový kalendář →';
 document.getElementById('waste-paper-plastic').textContent='Papír a plast: přesný termín zatím nemáme ověřený.';
}
export async function loadCollections(){try{const r=await fetch('/data/waste-calendar.json',{cache:'no-store'});if(!r.ok)throw Error('Calendar');renderCollections(await r.json());}catch{for(const id of ['waste-bio','waste-communal']){const n=document.getElementById(id);if(n)n.textContent='Termín se nepodařilo načíst';}}}
if(typeof document!=='undefined'&&document.getElementById('waste-bio')){loadCollections();setInterval(loadCollections,15*60*1000);}
