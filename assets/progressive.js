// Prepare the small first page of home cards together. Building whole sections
// during upward scrolling changes the document height and breaks reload restoration.
// Other pages may still defer work; additional home cards remain behind More.
const jobs=new Map();
let observer;
export function runSection(id){const job=jobs.get(id);if(!job)return Promise.resolve();if(!job.started){job.started=true;observer?.unobserve(job.root);job.root.dataset.loadState='loading';job.promise=Promise.resolve().then(job.load).then(()=>{job.root.dataset.loadState='ready';},()=>{job.root.dataset.loadState='error';});}return job.promise;}
export function watchSection(id,load){const root=document.getElementById(id);if(!root||root.closest('[hidden]'))return;jobs.set(id,{root,load,started:false});if(root.closest('#home')||!('IntersectionObserver'in window)){runSection(id);return;}observer??=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)runSection(entry.target.id);},{rootMargin:'700px 0px'});observer.observe(root);let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{}if(hash===id||root.contains(document.getElementById(hash)))runSection(id);}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search)return;let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{return;}const root=document.getElementById(id);if(root){const section=root.closest('section[id]');runSection(jobs.has(id)?id:section?.id);}});
 window.addEventListener('hashchange',()=>{let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const root=document.getElementById(id);runSection(jobs.has(id)?id:root?.closest('section[id]')?.id);});
}

// Keep a stable section/footer at the same screen position when a background
// response replaces content above the reader. Do not animate or hold scrolling.
export function keepViewport(update,win=globalThis.window,doc=globalThis.document){
 if(!win||!doc)return update();
 const y=win.scrollY;let anchor,top;
 if(y>0&&doc.elementFromPoint){const hit=doc.elementFromPoint(Math.min(win.innerWidth/2,win.innerWidth-1),Math.min(win.innerHeight-1,Math.max(180,win.innerHeight*.55)));anchor=hit?.closest('#home > section, footer');if(anchor)top=anchor.getBoundingClientRect().top;}
 const result=update();
 if(anchor?.isConnected&&win.scrollY===y){const delta=anchor.getBoundingClientRect().top-top;if(Math.abs(delta)>.5)win.scrollTo({top:y+delta,behavior:'instant'});}
 return result;
}
