const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function schoolEvent(item){
 const title=norm(item.title),body=[item.title,item.summary,...(item.body||[])].join(' '),n=norm(body);
 if(!/koncert|vystoupeni|predstaveni|pozvanka|den otevrenych|jarmark|vernisaz/.test(title)||/jidelni|platb|vysled|probeh|ohlednuti/.test(title))return null;
 const poster=item.extra?.images?.find(im=>im.url==='https://www.zsrtyne.cz/wp-content/uploads/2026/11/KONCERT-12.11.2026-724x1024.png');
 if(poster&&item.url==='https://www.zsrtyne.cz/zakovske-vystoupeni-hudebniho-oboru-zus-3')return {date:'2026-11-12',time:'18:00',location:'MAKUS, Rtyně v Podkrkonoší',text:'ZŠ a ZUŠ Rtyně v Podkrkonoší pořádá žákovské vystoupení hudebního oboru ZUŠ dne 12. listopadu 2026 od 18 hodin v Makusu.',evidence:'Údaje ověřeny z plakátu školy 11. 11. 2026.',poster:poster.url};
 const dates=[...body.matchAll(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/g)].map(m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`),unique=[...new Set(dates)];if(unique.length!==1)return null;const date=unique[0];if(!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return null;
 const t=n.match(/(?:od|v|zacatek\s*:?|zacina)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:hod|h\b)/),time=t&&+t[1]<=23&&+(t[2]||0)<=59?`${t[1].padStart(2,'0')}:${t[2]||'00'}`:null;
 const location=/makus/.test(n)?'MAKUS, Rtyně v Podkrkonoší':/orlovn/.test(n)?'Orlovna, Rtyně v Podkrkonoší':/kino na rychte/.test(n)?'Kino Na Rychtě, Rtyně v Podkrkonoší':null;
 return {date,time,location,text:item.summary||(item.body||[])[0]||item.title,evidence:'Termín podle textové pozvánky školy.'};
}
export function applySchoolEvent(item){const event=schoolEvent(item);if(!event)return item;item.event=event.date;item.extra={...item.extra,kind:'event',time:event.time,location:event.location,event_evidence:event.evidence,blocks:[...(item.extra?.blocks||[]).filter(b=>![event.text,event.evidence].includes(b.text)),...(event.poster?[{type:'paragraph',text:event.text},{type:'paragraph',text:event.evidence}]:[])]};if(event.poster){item.body=[...new Set([event.text,...(item.body||[])])];item.summary=event.text;}item.detail_ok=!!(item.body?.length||item.extra?.images?.length||item.extra?.blocks?.length);return item;}
