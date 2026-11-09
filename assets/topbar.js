const API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api?daily=1';
function dateNow(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});}
export function renderTopbar(nameday,expectedDate){const date=document.getElementById('today'),name=document.getElementById('daily-nameday');if(date)date.textContent=new Date().toLocaleDateString('cs-CZ',{timeZone:'Europe/Prague',weekday:'long',day:'numeric',month:'long',year:'numeric'});if(name)name.textContent=expectedDate===dateNow()&&typeof nameday==='string'&&nameday.trim()&&nameday.length<120?'Svátek má '+nameday:'';}
let pending=false;
async function load(){if(pending)return;pending=true;const today=dateNow();try{const r=await fetch(API,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const d=await r.json();if(d.date!==today)throw Error();renderTopbar(d.nameday,today);}catch{renderTopbar(null,today);}finally{pending=false;}}
if(typeof document!=='undefined'&&document.getElementById('daily-nameday')){renderTopbar();load();setInterval(load,15*60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}
