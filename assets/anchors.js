// The feed expands sections above a deep link after the browser's first jump.
// Restore that requested section once rendering finishes, unless the visitor
// has already started scrolling or interacting elsewhere.
export function preserveInitialAnchor(win,doc){
 let pending=win.location.hash,done=false,contentReady=false,doctorsReady=!doc.getElementById('doctor-news-grid');
 const cancel=()=>{pending='';};
 const changed=()=>{pending=win.location.hash;};
 const clicked=event=>{
  const link=event.target.closest?.('a[href]');
  if(!link){cancel();return;}
  const url=new URL(link.href,win.location.href);
  if(url.origin===win.location.origin&&url.pathname===win.location.pathname&&url.search===win.location.search&&url.hash)pending=url.hash;
  else cancel();
 };
 const cleanup=()=>{
  for(const type of ['wheel','touchstart','keydown'])win.removeEventListener(type,cancel);
  win.removeEventListener('hashchange',changed);doc.removeEventListener('pointerdown',cancel);doc.removeEventListener('click',clicked);
 };
 for(const type of ['wheel','touchstart','keydown'])win.addEventListener(type,cancel,{passive:true});
 win.addEventListener('hashchange',changed);doc.addEventListener('pointerdown',cancel);doc.addEventListener('click',clicked);
 const restore=()=>{
  if(done||!contentReady||!doctorsReady)return;done=true;cleanup();
  const requested=pending;
  if(!requested||requested!==win.location.hash)return;
  let id;try{id=decodeURIComponent(requested.slice(1));}catch{return;}
  win.requestAnimationFrame(()=>{
   if(requested!==win.location.hash)return;
   const target=doc.getElementById(id);
   if(target&&!target.closest('[hidden]'))target.scrollIntoView({behavior:'instant',block:'start'});
  });
 };
 doc.addEventListener('rtyne:content-ready',()=>{contentReady=true;restore();},{once:true});
 if(!doctorsReady)doc.addEventListener('rtyne:doctor-news-ready',()=>{doctorsReady=true;restore();},{once:true});
}
if(typeof window!=='undefined'&&document.getElementById('home'))preserveInitialAnchor(window,document);
