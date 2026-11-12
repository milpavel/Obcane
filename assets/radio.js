export function radioItems(items=[]){return items.filter(x=>x.source_key==='radio'&&x.payload?.in_latest!==false).sort((a,b)=>String(b.payload?.broadcast_date||b.published_at||'').localeCompare(String(a.payload?.broadcast_date||a.published_at||'')));}
export function renderRadio(feed,limit=6,doc=document){
 const grid=doc.getElementById('radio-grid'),more=doc.getElementById('radio-more'),status=doc.getElementById('radio-status');if(!grid||!more)return;
 const rows=radioItems(feed.items),make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};grid.replaceChildren();
 for(const x of rows.slice(0,limit)){
  const card=make('article',null,'news-card radio-card'),meta=make('div',null,'meta'),date=x.payload?.broadcast_date||x.published_at?.slice(0,10),time=make('time',date?new Date(date+'T12:00:00Z').toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'long',year:'numeric'}):'Datum neuvedeno');if(date)time.dateTime=date;
  meta.append(make('span','MĚSTSKÝ ROZHLAS','category'),time);const h=make('h3'),title=make('a',x.title),link=make('a','Přečíst celé hlášení →','read');title.href=link.href='/?zprava='+encodeURIComponent(x.id);h.append(title);card.append(meta,h);if(x.summary)card.append(make('p',x.summary));card.append(link);grid.append(card);
 }
 more.hidden=limit>=rows.length;
 if(!rows.length)grid.append(make('p','Hlášení se nyní nepodařilo načíst. Dostupný je archiv města.','muted'));
 if(status)status.textContent='';
}
