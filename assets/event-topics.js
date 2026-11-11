const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const eventTopics=[['all','Všechny akce'],['culture','Kultura'],['sport','Sport'],['family','Pro rodiny'],['learning','Přednášky a poznávání'],['community','Společenské akce'],['other','Ostatní']];
export function eventTags(item){const s=norm([item.title,item.summary,...(item.payload?.body||[]).slice(0,3)].join(' ')),tags=new Set();
 if(item.payload?.sport||['florbal','banik','volejbal'].includes(item.source_key)||/\bflorbal|fotbal|volejbal|turnaj|sportovni|utkani|\bzapas\w*|beh\b|bezeck|pochod|turist/.test(s))tags.add('sport');
 if(['library','koletovka','sms_areal','sms_orlovna'].includes(item.source_key)||/koncert|vystoupeni|divadl|\bkino\b|\bfilm\w*|hudeb|vystav|vernisaz|festival|muzik/.test(s))tags.add('culture');
 if(/\bdeti\b|detsk|rodin|strasidel|strasidelne|pohad|karneval|mikulas|drakiad|lampion|palen[iy] carodejnic/.test(s))tags.add('family');
 if(/prednask|besed|cestopis|workshop|kurz|exkurz|prohlidk|putovani|seminar/.test(s))tags.add('learning');
 if(/\bples\b|\bplese\b|slavnost|jarmark|setkani|rozsviceni|pout\b|posezeni|zabava|vinobrani/.test(s))tags.add('community');
 return tags.size?[...tags]:['other'];
}
export function matchesEventTopic(item,topic){return topic==='all'||eventTags(item).includes(topic);}
