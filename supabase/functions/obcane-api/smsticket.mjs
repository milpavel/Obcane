const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const dateFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormat=new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'});
function ticketURL(href,base){const u=new URL(href,base);if(u.protocol!=='https:'||u.hostname!=='www.smsticket.cz'||u.username||u.password||!/^\/vstupenky\/\d+-/.test(u.pathname))throw Error('Nepovolený odkaz SMS ticket');u.hash='';u.search='';return u.href;}
export function parseSmsVenue(doc,source,today=dateFormat.format(new Date())){
 const heading=clean(doc.querySelector('h1')?.textContent);
 if(!heading.includes(source.venue_name)||!heading.includes('Rtyně v Podkrkonoší'))throw Error('SMS ticket nevrátil očekávané místo');
 const cards=[...doc.querySelectorAll('.event[property="event"]')];
 if(!cards.length&&doc.querySelector('a[href*="/vstupenky/"]'))throw Error('Změna struktury pozvánek SMS ticket');
 const out=[],seen=new Set();
 for(const card of cards){
  const place=card.querySelector('[property="location"] [property="url"]')?.getAttribute('href');
  if(!place||new URL(place,source.url).pathname!==new URL(source.url).pathname)throw Error('Pozvánka patří jinému místu');
  const title=clean(card.querySelector('strong[property="name"]')?.textContent),href=card.querySelector('a[href*="/vstupenky/"]')?.getAttribute('href');
  const raw=card.querySelector('[property="startDate"]')?.getAttribute('content')||'';
  if(!title||!href||!/^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(raw))throw Error('Pozvánka nemá ověřitelný název, odkaz nebo čas');
  const instant=new Date(raw.replace(/(\.\d{3})\d+(?=Z|[+-]\d\d:\d\d$)/,'$1'));
  if(!Number.isFinite(instant.getTime()))throw Error('Neplatný termín SMS ticket');
  const url=ticketURL(href,source.url),event=dateFormat.format(instant);if(event<today||seen.has(url))continue;seen.add(url);
  const location=source.venue_name+', Rtyně v Podkrkonoší',time=timeFormat.format(instant);
  const cancelled=/EventCancelled$/i.test(card.querySelector('[property="eventStatus"]')?.getAttribute('content')||'');
  out.push({title,url,event,published:null,summary:location+' · '+time,body:[location],detail_ok:true,extra:{kind:'event',calendar_only:true,in_latest:true,location,time,cancelled,ticket_url:url,event_sources:[{title:'Vstupenky na SMS ticketu',url}]}});
 }
 return out.sort((a,b)=>(a.event+' '+a.extra.time).localeCompare(b.event+' '+b.extra.time));
}
