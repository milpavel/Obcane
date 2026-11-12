const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function isHousingNotice(title){const s=normalize(title);return !/nebyt|pozem|garaz|ubytovn/.test(s)&&/\bbyt(?:u|y|ove|ovou|ovych|ovych)?\b/.test(s)&&/pronaj|najem|vyberove rizeni|voln/.test(s);}
export function deadlineFromText(text){
 const m=normalize(text).match(/(?:uzaverka\s*(?:zadosti|nabidek)?|zadosti\s*(?:doructe|podavejte|do)|nabidky\s*(?:doructe|do)|termin\s*(?:podani|odevzdani)[^\n.]{0,40})\s*[:–-]?\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})/);
 if(!m)return null;const d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d?d:null;
}
export function deadlineAtFromText(text){
 const date=deadlineFromText(text);if(!date)return null;
 const normalized=normalize(text),start=normalized.search(/uzaverka|zadosti\s*(?:doructe|podavejte|do)|nabidky\s*(?:doructe|do)|termin\s*(?:podani|odevzdani)/);
 const piece=normalized.slice(start,start+200),m=piece.match(/\d{1,2}\.\s*\d{1,2}\.\s*20\d{2}\s*(?:v\s*|do\s*)?(\d{1,2})[.:](\d{2})/);
 const hour=m?Number(m[1]):23,minute=m?Number(m[2]):59;if(hour>23||minute>59)return null;
 const wanted=new Date(date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':'+(m?'00':'59')+'Z');
 const offset=Intl.DateTimeFormat('en-US',{timeZone:'Europe/Prague',timeZoneName:'shortOffset'}).formatToParts(wanted).find(p=>p.type==='timeZoneName').value.match(/GMT([+-])(\d+)(?::(\d+))?/);
 const minutes=offset?(offset[1]==='-'?-1:1)*(Number(offset[2])*60+Number(offset[3]||0)):0;
 return new Date(wanted.getTime()-minutes*60000).toISOString();
}
export async function collectMunicipal({page,parseHTML,today}){
 const links=new Map();const unverified=[];
 // Only current official lists. Do not turn historical search results into offers.
 for(const url of ['https://www.rtyne.cz/','https://www.rtyne.cz/uredni-deska']){
  const html=await page(url);const {document}=parseHTML(html);
  for(const a of document.querySelectorAll('a[href]')){const title=a.textContent.replace(/\s+/g,' ').trim();if(!isHousingNotice(title))continue;const u=new URL(a.getAttribute('href'),url);if(u.hostname!=='www.rtyne.cz'||u.protocol!=='https:')continue;links.set(u.href,title);}
 }
 const offers=[];
 for(const [url,title] of [...links].slice(0,12)){
  const {document}=parseHTML(await page(url));document.querySelectorAll('nav,header,footer,script,style,form').forEach(n=>n.remove());const node=document.querySelector('.detail__body,.detail-content,.article-content,main')||document.body;
  const body=node.textContent.replace(/[ \t]+/g,' ').trim();const deadline=deadlineFromText(body),expires_at=deadlineAtFromText(body);
  if(!deadline||!expires_at){unverified.push({title,url});continue;}
  if(deadline<today)continue;
  offers.push({title:title.slice(0,110),description:body.slice(0,4000),source_url:url,deadline,expires_at});
 }
 return {offers,unverified};
}
