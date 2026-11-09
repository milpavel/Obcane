const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const generic=new Set('pozvanka prijdte zahrat pozvani prijemne spolecne setkani koncert koncerty adventni vanocni prednaska cestopisna putovani listopadove rtyne podkrkonosi knihovna knihovny mestsky mesta klubiku skautsky slavnost slavnosti'.split(' '));
const topics=title=>[...new Set(normal(title).match(/[a-z]+/g)||[])].filter(w=>w.length>=3&&!generic.has(w));
function sameEvent(a,b){
 if(a.payload?.location&&b.payload?.location&&normal(a.payload.location)!==normal(b.payload.location))return false;
 if(a.payload?.time&&b.payload?.time&&a.payload.time!==b.payload.time)return false;
 const x=topics(a.title),y=topics(b.title),shared=x.filter(w=>y.includes(w)),distinctive=shared.some(w=>w.length>=7);
 if(a.event_date!==b.event_date){
  // Only reconcile adjacent conflicting dates when the library is the organizer.
  return new Set([a.source_key,b.source_key]).size===2&&[a.source_key,b.source_key].every(k=>['calendar','library'].includes(k))&&Math.abs(Date.parse(a.event_date)-Date.parse(b.event_date))===86400000&&distinctive;
 }
 const canonical=s=>normal(s).replace(/[^a-z0-9]+/g,' ').trim();
 return canonical(a.title)===canonical(b.title)||distinctive||shared.length>=2;
}
export function uniqueEvents(items){
 const priority={library:0,calendar:1,scouts:2,orel:3,koletovka:4},result=[];
 for(const item of [...items].sort((a,b)=>(priority[a.source_key]??5)-(priority[b.source_key]??5))){
  const index=result.findIndex(x=>sameEvent(x,item));
  if(index<0){result.push({...item,payload:{...item.payload}});continue;}
  const prior=result[index],refs=prior.payload.event_alternatives||[];
  refs.push({id:String(item.id),source_key:item.source_key,date:item.event_date,url:item.external_url});
  prior.payload.event_alternatives=refs;
  if(prior.event_date===item.event_date&&!prior.payload.time)prior.payload.time=item.payload?.time;
  if(prior.event_date!==item.event_date)prior.payload.date_conflict=true;
 }
 return result;
}
