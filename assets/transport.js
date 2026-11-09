const API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api?transport=1';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const time=new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',hour:'2-digit',minute:'2-digit'});
const date=new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'numeric'});
const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit'});
let data=null,received=0,serverTime=0,sequence=0,loading=false;
const now=()=>serverTime?serverTime+performance.now()-received:Date.now();
function clock(value){const t=Date.parse(value);return (day.format(t)!==day.format(now())?date.format(t)+' ':'')+time.format(t);}
function external(text,url){const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function delayText(d){return d.delay_minutes===null?'Zpoždění není k dispozici':d.delay_minutes===0?'Hlášeno včas':'Hlášené zpoždění +'+d.delay_minutes+' min';}
export function delayExplanation(kind,minutes){
 if(!Number.isFinite(minutes)||minutes<=0)return '';
 const unit=minutes===1?'minuta':minutes>=2&&minutes<=4?'minuty':'minut';
 return 'Zpoždění '+(kind==='train'?'vlaku':'autobusu')+' '+minutes+' '+unit;
}
export function delayBadge(minutes){if(!Number.isFinite(minutes)||minutes<=0)return null;const badge=node('span','+'+minutes+' min','departure-delay');badge.setAttribute('aria-label',delayExplanation('train',minutes).replace('Zpoždění vlaku','Hlášené zpoždění'));return badge;}
function fresh(board){return board?.status==='ok'&&Date.parse(board.expires_at)>now();}
function departures(board){return (board?.departures||[]).filter(d=>Date.parse(d.expected_at)>=now());}
function render(){
 for(const kind of ['train','bus']){
  const board=data?.boards.find(b=>b.kind===kind),summary=$('next-'+kind),list=$('departures-'+kind),meta=$('transport-meta-'+kind),source=$('transport-source-'+kind);
  summary.replaceChildren();list.replaceChildren();meta.replaceChildren();
  const selected=$('transport-stop-'+kind),stopName=selected.selectedOptions[0]?.textContent||'';
  source.href=board?.source_url||'https://iredo.online/departures/'+selected.value;
  summary.append(node('small',stopName,'departure-stop'));
  if(!fresh(board)){
   const text=loading&&!data?'Načítáme odjezdy…':'Odjezdy se nyní nepodařilo ověřit';
   summary.append(node('strong',text,'departure-empty'));list.append(node('p',text,'muted'));
   if(board?.status==='ok')meta.textContent='Údaje už nejsou aktuální. Ověřte odjezdy přímo v IREDO.';
   else meta.textContent='Aktuální tabule je dostupná přes odkaz pod přehledem.';
  }else{
   const upcoming=departures(board);
   if(!upcoming.length){summary.append(node('span','V příštích 2 hodinách žádný spoj','departure-empty'));list.append(node('p','V nejbližších 2 hodinách není hlášen další odjezd. Pozdější spoje vyhledejte v IDOS.','muted'));}
   else{
    const first=upcoming[0],headline=node('strong',undefined,'departure-headline'),clockGroup=node('span',undefined,'departure-clock');clockGroup.append(node('span',clock(first.expected_at),'departure-time'));const badge=delayBadge(first.delay_minutes);if(badge)clockGroup.append(badge);headline.append(clockGroup,node('span','→ '+first.direction,'departure-direction'));
    summary.append(headline);const state=[first.line,first.delay_minutes>0?'':delayText(first)].filter(Boolean).join(' · ');if(state)summary.append(node('small',state,'departure-state'));
    if(first.detour)summary.append(node('small','Výluka / změna trasy – ověřte v IREDO','is-delayed'));
    if(first.delay_minutes>0){summary.append(node('small',delayExplanation(kind,first.delay_minutes),'departure-delay-note'));summary.append(node('small','Podle jízdního řádu '+clock(first.scheduled_at)));}
    for(const d of upcoming.slice(0,6)){
     const row=node('li',undefined,'departure-row'),when=node('div',undefined,'departure-when'),detail=node('div',undefined,'departure-detail');
     when.append(node('strong',clock(d.expected_at)));const badge=delayBadge(d.delay_minutes);if(badge)when.append(badge);
     if(d.delay_minutes>0)when.append(node('small','JŘ '+clock(d.scheduled_at)));
     detail.append(node('strong',d.direction),node('span',[d.line,d.platform?(kind==='bus'?'Stanoviště ':'Nástupiště ')+d.platform:''].filter(Boolean).join(' · ')));
     detail.append(node('small',d.delay_minutes>0?delayExplanation(kind,d.delay_minutes):delayText(d),'departure-state'));
     if(d.detour)detail.append(node('small','Výluka / změna trasy – ověřte v IREDO','is-delayed'));
     row.append(when,detail);list.append(row);
    }
   }
   meta.textContent='Ověřeno '+time.format(Date.parse(board.fetched_at))+' · zdroj IREDO';
  }
 }
 const status=$('transport-status');
 status.textContent=loading?'Ověřujeme aktuální odjezdy…':data?.boards.every(fresh)?'Automatická aktualizace každou minutu.':'Část odjezdů se nyní nepodařilo ověřit.';
}
async function refresh(){
 const ticket=++sequence;loading=true;$('transport-refresh').disabled=true;
 // Old boards must not appear under a newly selected stop.
 if(data?.boards.some(b=>b.id!==$('transport-stop-'+b.kind).value))data=null;
 render();
 try{
  const query=new URLSearchParams({train:$('transport-stop-train').value,bus:$('transport-stop-bus').value});
  const r=await fetch(API+'&'+query,{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Transport unavailable');const result=await r.json();
  if(!Array.isArray(result.boards)||result.boards.length!==2||!Number.isFinite(Date.parse(result.generated_at)))throw Error('Invalid transport response');
  for(const kind of ['train','bus']){const b=result.boards.find(x=>x.kind===kind);if(!b||b.id!==$('transport-stop-'+kind).value||!Array.isArray(b.departures))throw Error('Wrong departure stop');}
  if(ticket!==sequence)return;
  data=result;received=performance.now();serverTime=Date.parse(result.generated_at);
 }catch{if(ticket===sequence)data=null;}
 finally{if(ticket===sequence){loading=false;$('transport-refresh').disabled=false;render();}}
}
if(typeof document!=='undefined'&&$('doprava')){
 for(const kind of ['train','bus']){
  const select=$('transport-stop-'+kind);
  try{const saved=localStorage.getItem('rtyne-transport-'+kind);if([...select.options].some(o=>o.value===saved))select.value=saved;}catch{}
  select.addEventListener('change',()=>{try{localStorage.setItem('rtyne-transport-'+kind,select.value);}catch{}refresh();});
 }
 $('transport-refresh').addEventListener('click',refresh);
 refresh();setInterval(()=>{if(!document.hidden&&!loading)refresh();},60000);
 setInterval(()=>{if(!document.hidden)render();},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();refresh();}});
 window.addEventListener('pageshow',event=>{if(event.persisted){data=null;refresh();}});
}
