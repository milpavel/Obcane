const normal=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\W+/g,' ').trim();
export function qualityIssues(feed){
 const issues=[],seen=new Map();
 for(const x of feed.items||[]){
  if(x.payload?.in_latest===false||x.payload?.cancelled)continue;
  const kind=x.payload?.kind;
  if(kind==='event'&&(!x.event_date||!x.payload?.time||!x.payload?.location))issues.push({item:x,reason:!x.event_date?'Chybí datum akce':!x.payload?.time?'Chybí čas akce':'Chybí místo akce'});
  if(!x.summary&&!x.payload?.body?.length&&!x.payload?.sections?.length&&!x.payload?.blocks?.length&&!x.payload?.images?.length&&!x.payload?.attachments?.length)issues.push({item:x,reason:'Prázdný text – ověřit původní zdroj'});
  const key=normal(x.title)+'|'+(x.event_date||'');if(seen.has(key)&&seen.get(key)!==String(x.id))issues.push({item:x,reason:'Možná duplicita stejného názvu a termínu'});else seen.set(key,String(x.id));
 }
 return issues;
}
export function renderSourceQuality(root,feed){
 const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;},box=make('section','');box.className='admin-quality';
 const issues=qualityIssues(feed);box.append(make('h3','Kontrola úplnosti obsahu'),make('p',issues.length+' podnětů ke kontrole. Jde o upozornění pro redakci, ne automatické potvrzení chyby. U akcí může pořadatel čas nebo místo teprve doplnit.'));
 const details=document.createElement('details');details.append(make('summary','Prohlédnout záznamy ke kontrole'));
 for(const {item,reason}of issues.slice(0,60)){const p=make('p',reason+' · '),a=make('a',item.title);a.href='/?zprava='+encodeURIComponent(item.id);a.target='_blank';a.rel='noopener noreferrer';p.append(a);details.append(p);}box.append(details);root.append(box);
}
