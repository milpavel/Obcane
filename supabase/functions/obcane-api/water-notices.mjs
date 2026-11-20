const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
export function inlineWaterNotices(doc,source,today){
 const out=[];
 for(const card of doc.querySelectorAll('.newsCard')){
  if(card.querySelector('a.titleLink'))continue;
  const title=text(card.querySelector('h2.title')),stamp=text(card.querySelector('.date')).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/);
  const body=[...card.querySelectorAll('.cms p,.cms li')].map(text).filter(Boolean);
  if(!title||!stamp||!body.length)continue;
  const published=`${stamp[3]}-${stamp[2].padStart(2,'0')}-${stamp[1].padStart(2,'0')}`;
  if(isNaN(Date.parse(published))||!new Date(published).toISOString().startsWith(published))continue;
  // Archive old undated warnings rather than present their continued validity as verified.
  const age=(Date.parse(today)-Date.parse(published))/86400000,fresh=age>=0&&age<=7;
  const scheduled=[...(title+' '+body.join(' ')).matchAll(/(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/g)].some(m=>{const d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return d>=today&&Date.parse(d)<=Date.parse(today)+120*86400000;});
  if(!fresh&&!scheduled&&!/upozornění|oznámení/i.test(title))continue;
  const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
  out.push({title,url:source.url+'#upozorneni-'+published+'-'+slug,body,summary:body.join(' ').slice(0,500),published,detail_ok:true,extra:{inline_notice:true,in_latest:fresh||scheduled,notice_needs_review:!fresh&&!scheduled,blocks:body.map(text=>({type:'paragraph',text}))}});
 }
 return out;
}
