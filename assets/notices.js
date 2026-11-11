// One public notice per real-world restriction, retaining all original announcements.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const monthNames=['ledna','unora','brezna','dubna','kvetna','cervna','cervence','srpna','zari','rijna','listopadu','prosince'];
function iso(day,month,year){const value=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:null;}
function dates(text){const out=[],s=normalize(text);for(const m of s.matchAll(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/g)){const d=iso(+m[1],+m[2],+m[3]);if(d)out.push(d);}for(const m of s.matchAll(/\b(\d{1,2})\.\s*(ledna|unora|brezna|dubna|kvetna|cervna|cervence|srpna|zari|rijna|listopadu|prosince)\s+(20\d{2})\b/g)){const d=iso(+m[1],monthNames.indexOf(m[2])+1,+m[3]);if(d)out.push(d);}return [...new Set(out)].sort();}
export function healthRestriction(x){const s=normalize([x.title,x.summary,...(x.payload?.body||[])].join(' '));return x.source_key==='city'&&/lekarn|ordinac|lekar[euya]/.test(s)&&/dovolen|zkracen|neordin|zavren|uzavren|zastup|omezeni provozu/.test(s);}
export function isRestriction(x){return x.source_key==='water'||x.source_key==='city'&&(healthRestriction(x)||/odstav|dodavk|uzav|frez|asfalt|elektr|havar/.test(normalize(x.title)));}
export function restrictionKind(x){
 const title=normalize(x.title),content=normalize([x.summary,...(x.payload?.body||[])].join(' '));
 // Classify the affected subject, never the word "uzavření" on its own.
 if(x.source_key==='water'||/\bvod(?:a|y|u|ou|ovod\w*|ni\w*)\b/.test(title))return /odkal/.test(title)?'water-flush':'water';
 if(/elektr/.test(title))return 'electricity';
 if(/asfalt/.test(title))return 'road-asphalt';
 if(/frez/.test(title))return 'road-milling';
 if(/silnic|komunikac|doprav|\b(?:ulice|ulici|ulicich|ul\.)|mostu|moste/.test(title))return 'road-closure';
 if(/\burad\w*|\bradnic\w*/.test(title))return 'office';
 if(healthRestriction(x))return /lekarn/.test(title+' '+content)?'pharmacy':'doctor';
 if(/\burad\w*|\bradnic\w*/.test(content))return 'office';
 return 'service';
}
export function restrictionLabel(kind){return kind.startsWith('water')?'Voda':({electricity:'Elektřina',pharmacy:'Lékárna',doctor:'Ordinace',office:'Úřad','road-asphalt':'Doprava','road-milling':'Doprava','road-closure':'Doprava'})[kind]||'Provoz';}
function describe(x){const content=normalize([x.title,x.summary,...(x.payload?.body||[])].join(' '));const effectiveKind=restrictionKind(x);
 const titleDates=dates(x.title),bodyDates=dates((x.payload?.body||[]).slice(0,2).join(' '));const explicit=[x.event_date,x.payload?.restriction_date].filter(d=>/^20\d\d-\d\d-\d\d$/.test(d||''));const period=bodyDates.length?bodyDates:titleDates.length?titleDates:explicit;
 const roads=[...content.matchAll(/\b([ivx]+)\s*\/\s*(\d{1,4})\b/g)].map(m=>m[1]+'/'+m[2]);
 const streets=[];for(const pattern of [/\bulic\w*\s+([a-z]{4,})/g,/\b([a-z]{4,})\s+ulic\w*/g,/\bul\.\s*([a-z]{4,})/g])for(const m of content.matchAll(pattern)){const word=m[1].replace(/(?:skeho|skou|skem|ske|ska|sky)$/,'sk').replace(/(?:icke|icka|ickou)$/,'ick');if(!['prerusena','dotcenym','ve','rtyni','bude','voda','castech','casti'].includes(word))streets.push(word);}
 const houses=[];for(const m of content.matchAll(/\b(?:cp|c\s*\.\s*p|ce|c\s*\.\s*ev)\.?\s*(\d+(?:\s*(?:,|a)\s*\d+)*)/g))houses.push(...m[1].match(/\d+/g));
 return {kind:effectiveKind,start:period[0]||null,end:period.at(-1)||null,roads:[...new Set(roads)],streets:[...new Set(streets)],houses,title:normalize(x.title).replace(/\s+/g,' ').trim()};
}
const overlap=(a,b)=>a.start&&b.start&&a.start<=b.end&&b.start<=a.end;
const shared=(a,b)=>a.filter(x=>b.includes(x));
function matches(a,b){if(a.kind!==b.kind||!overlap(a,b))return false;
 if(['doctor','pharmacy','office','service'].includes(a.kind))return false;
 if(shared(a.streets,b.streets).length)return true;
 if(a.kind.startsWith('road-')&&shared(a.roads,b.roads).length){if(a.streets.length&&b.streets.length)return false;return true;}
 if(a.kind.startsWith('water')&&shared(a.houses,b.houses).length>=2)return true;
 // A generic title and date alone cannot identify the affected street or households.
 return false;
}
function preference(x,info){const duration=info.start?(Date.parse(info.end)-Date.parse(info.start))/86400000:0;return (x.source_key==='water'?10000:0)+duration*10+Math.min((x.payload?.body||[]).join(' ').length/10000,1);}
export function groupRestrictions(items){const groups=[];
 for(const item of items.filter(x=>isRestriction(x)&&x.payload?.in_latest!==false)){
  const info=describe(item);let group=groups.find(g=>g.members.some(m=>m.item.external_url===item.external_url||matches(m.info,info)));
  if(!group){group={members:[]};groups.push(group);}group.members.push({item,info});
 }
 return groups.map(g=>{const sorted=g.members.slice().sort((a,b)=>preference(b.item,b.info)-preference(a.item,a.info));const primary=sorted[0].item;const starts=g.members.map(m=>m.info.start).filter(Boolean).sort(),ends=g.members.map(m=>m.info.end).filter(Boolean).sort();
  const related=g.members.map(({item})=>({id:item.id,title:item.title,url:item.external_url,source_key:item.source_key}));
  return {...primary,payload:{...primary.payload,restriction:{kind:sorted[0].info.kind,start:starts[0]||null,end:ends.at(-1)||null},related_sources:related},notice_ids:g.members.map(m=>String(m.item.id))};
 }).sort((a,b)=>(a.payload.restriction.start||'9999').localeCompare(b.payload.restriction.start||'9999'));
}
export function upcomingRestrictions(items,today){return groupRestrictions(items).filter(x=>!x.payload.restriction.end||x.payload.restriction.end>=today);}
export function noticeDate(x){const d=x.payload?.restriction;if(!d?.start)return '';const fmt=s=>new Date(s+'T12:00:00').toLocaleDateString('cs-CZ',{day:'numeric',month:'numeric',year:'numeric'});return d.start===d.end?fmt(d.start):fmt(d.start)+' – '+fmt(d.end);}
