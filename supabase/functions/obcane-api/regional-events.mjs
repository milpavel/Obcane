// Import factual calendar metadata only; never copy regional articles or photographs.
const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const towns=['Rtyně v Podkrkonoší','Rtyně','Úpice','Batňovice','Havlovice','Malé Svatoňovice','Velké Svatoňovice','Libňatov','Červený Kostelec','Hronov','Suchovršice','Radvanice','Markoušovice'];
function date(d,m,y){const iso=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;return !isNaN(Date.parse(iso))&&new Date(iso).toISOString().startsWith(iso)?iso:null;}
export function regionalListingURL(source,today){
 if(source.key!=='region_kjh')return source.url;
 const [y,m,d]=today.split('-');return source.url+'/filtry/'+encodeURIComponent(JSON.stringify({regiony:[],filtry:[],datumy:{od:`${d}.${m}.${y}`}}));
}
export function regionalEvents(doc,source,today){
 const kjh=source.key==='region_kjh',cards=[...doc.querySelectorAll(kjh?'.front':'.newsList__block')];
 if(!cards.length)throw Error('Regionální kalendář nemá očekávanou strukturu');
 const horizon=new Date(Date.parse(today)+120*86400000).toISOString().slice(0,10),out=[],seen=new Set();
 for(const card of cards){
  const title=text(card.querySelector(kjh?'h3':'.newsList__title strong:not(.newsList__date)'));
  const place=text(card.querySelector(kjh?'.card-item-regiony':'.newsList__title em'));
  const municipality=towns.find(t=>place.split(',').some(p=>normal(p.trim())===normal(t)));
  if(!municipality||/^Rtyně/.test(municipality)||!title||title.length>220)continue;
  const raw=text(card.querySelector(kjh?'.card-item-datum':'.newsList__date'));
  const days=[...raw.matchAll(/(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/g)].map(m=>date(m[1],m[2],m[3]));
  if(!days.length||days.some(d=>!d))continue;
  const start=days[0],end=days.at(-1);
  // Reject undated, historical, reversed and long umbrella listings (not individual events).
  if(end<today||start>horizon||end<start||(Date.parse(end)-Date.parse(start))/86400000>14)continue;
  let url;try{const u=new URL(card.querySelector(kjh?'a[href]':'.newsList__title a')?.getAttribute('href'),source.url);if(u.origin!==new URL(source.url).origin||u.protocol!=='https:'||u.username||u.password)continue;u.pathname=u.pathname.split('/filtry/')[0];u.search='';u.hash='';url=u.href;}catch{continue;}
  // This listing conflicts with the organizer's 19 December programme. Reconsider if its date changes.
  if(url==='https://kladskepomezi.cz/kalendar-akci/staroceske-vanoce-na-drevence'&&start==='2026-11-20')continue;
  if(!url.includes(kjh?'/cs/akce/detail/id/':'/kalendar-akci/')||seen.has(url))continue;
  seen.add(url);
  const nearby=!/^Rtyně/.test(municipality),summary=`${municipality} · ${raw.replace(/^(?:Po|Út|St|Čt|Pá|So|Ne)\s*/,'')}. Program a případné změny ověřte u pořadatele.`;
  out.push({title,url,event:start,summary,body:[summary],detail_ok:true,extra:{kind:'event',calendar_only:true,nearby,municipality,location:null,end_date:end,regional:true,source_listing:source.url,blocks:[{type:'paragraph',text:summary}],event_sources:[{text:'Původní pozvánka – '+source.name,url}]}});
 }
 return out.slice(0,30);
}
