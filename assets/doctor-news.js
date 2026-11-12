import {watchSection} from './progressive.js?v=20261112-progressive-1';
import {fetchDoctorAnnouncements} from './doctor-data.js?v=20261109-1';
const labels={provoz:'Provoz ordinace',ockovani:'Očkování',informace:'Sdělení ordinace'};
const make=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
let data=null,pending=null;
function source(doctor){const a=make('a','Web ordinace ↗','text-link');a.href=doctor.source_url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function notices(doctor,limit){
 const box=make('div',undefined,'doctor-notices');
 if(doctor.status!=='ok'){box.append(make('p','Oznámení se nyní nepodařilo ověřit. Před návštěvou otevřete web ordinace.','muted'));return box;}
 if(!doctor.notices.length){box.append(make('p','V načteném přehledu ordinace nejsou další sdělení. Aktuální provoz ověřte na jejím webu.','muted'));return box;}
 for(const n of doctor.notices.slice(0,limit)){const article=make('article',undefined,'doctor-notice'+(n.kind==='provoz'?' doctor-notice-operation':''));article.append(make('span',labels[n.kind]||labels.informace,'doctor-notice-label'),make('p',n.text));box.append(article);}
 return box;
}
function stamp(doctor){return doctor.checked_at?'Ověřeno '+new Date(doctor.checked_at).toLocaleString('cs-CZ',{timeZone:'Europe/Prague',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+' · sdělení z webu ordinace':'Zdroj nyní není dostupný';}
function render(){
 for(const doctor of [{id:'hartman',name:'MUDr. Jan Hartman'},{id:'hartmanova',name:'MUDr. Naděžda Hartmanová'}]){const section=[...document.querySelectorAll('#article .detail-section')].find(s=>s.querySelector('h2')?.textContent.trim()===doctor.name);if(section){section.id='ordinace-'+doctor.id;document.querySelectorAll('.detail-contents a').forEach(a=>{if(a.textContent===doctor.name)a.href='#'+section.id;});}}
 if(!data)return;
 const restrictions=document.getElementById('restrictions');
 if(restrictions){restrictions.querySelectorAll('.doctor-restriction-card,.doctor-restriction-status').forEach(n=>n.remove());if(data.doctors.some(d=>d.status!=='ok')){const warning=make('p','Část oznámení ordinací se nyní nepodařilo ověřit. Aktuální provoz ověřte na webu ordinace.','doctor-restriction-status muted');warning.setAttribute('role','status');restrictions.append(warning);}const operational=data.doctors.flatMap(d=>(d.status==='ok'?d.notices:[]).filter(n=>n.kind==='provoz').map(n=>({doctor:d,notice:n})));if(operational.length)restrictions.querySelectorAll(':scope > p.muted').forEach(n=>n.remove());for(const {doctor,notice} of operational){const card=make('article',undefined,'restriction-card doctor-restriction-card'),icon=make('span','+','restriction-icon');icon.setAttribute('aria-hidden','true');const content=make('div',undefined,'restriction-content'),meta=make('div',undefined,'restriction-meta');meta.append(make('span','Ordinace','restriction-type'),make('span',stamp(doctor)));const heading=make('h3',doctor.name),detail=make('a','Sdělení ordinace a zastupování →','text-link');detail.href='/?zprava=280#ordinace-'+doctor.id;content.append(meta,heading,make('p',notice.text),detail);card.append(icon,content);restrictions.append(card);}}
 const home=document.getElementById('doctor-news-grid');if(home){home.replaceChildren();for(const doctor of data.doctors){const card=make('article',undefined,'doctor-news-card');card.append(make('h3',doctor.name),make('p',stamp(doctor),'doctor-checked'),notices(doctor,2));const links=make('div',undefined,'doctor-news-links'),detail=make('a','Všechna sdělení a ordinační hodiny →','text-link');detail.href='/?zprava=280#ordinace-'+doctor.id;links.append(detail,source(doctor));card.append(links);home.append(card);}}
 for(const doctor of data.doctors){const section=[...document.querySelectorAll('#article .detail-section')].find(s=>s.querySelector('h2')?.textContent.trim()===doctor.name);if(!section)continue;section.id='ordinace-'+doctor.id;const heading=section.querySelector('h2');document.querySelectorAll('.detail-contents a').forEach(a=>{if(a.textContent===doctor.name)a.href='#'+section.id;});let panel=section.querySelector('.doctor-detail-news');if(panel)panel.remove();panel=make('aside',undefined,'doctor-detail-news');panel.setAttribute('aria-label','Oznámení ordinace');panel.append(make('h3','Aktuálně z ordinace'),make('p',stamp(doctor),'doctor-checked'),notices(doctor,8),source(doctor));heading.after(panel);}

}
async function load(){if(pending)return pending;pending=(async()=>{try{const d=await fetchDoctorAnnouncements();if(!Array.isArray(d.doctors))throw Error();data=d;document.dispatchEvent(new CustomEvent('rtyne:doctor-news-ready',{detail:d.doctors}));}catch{data={doctors:[{id:'hartman',name:'MUDr. Jan Hartman',source_url:'https://www.doktor-rtyne.cz/jan-hartman',status:'unavailable',notices:[]},{id:'hartmanova',name:'MUDr. Naděžda Hartmanová',source_url:'https://www.doktor-rtyne.cz/nadezda-hartmanova',status:'unavailable',notices:[]}]};document.dispatchEvent(new CustomEvent('rtyne:doctor-news-ready',{detail:data.doctors}));}render();})().finally(()=>{pending=null;});return pending;}
if(typeof document!=='undefined'&&document.getElementById('home')){
 let started=false;const start=()=>{started=true;return load();};
 document.addEventListener('rtyne:content-ready',()=>{render();if(new URLSearchParams(location.search).get('zprava')==='280')start();});
 if(document.getElementById('restrictions'))watchSection('omezeni',start);
 if(document.getElementById('doctor-news-grid'))watchSection('aktuality-lekaru',start);
 setInterval(()=>{if(started&&!document.hidden)load();},600000);
}
