// The article discussion has its own lifecycle, independent of news rendering.
const mounted=new WeakMap();
const validKey=value=>/^post:[1-9]\d*$/.test(value||'');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const topicURL=key=>'/komunita/?tema='+encodeURIComponent(key);
async function resolveKey(root){
 if(validKey(root.dataset.discussionKey))return root.dataset.discussionKey;
 const slug=new URLSearchParams(location.search).get('clanek');if(!slug)return null;
 const query=new URLSearchParams({select:'id',slug:'eq.'+slug,status:'eq.published',limit:'1'});
 const response=await fetch('https://dvbaihwplzwljxrtkymi.supabase.co/rest/v1/obcane_posts?'+query,{headers:{apikey:'sb_publishable_8Lr9Tnh1CnrB_ra6VCYrZQ_C4WDZ4l3'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Článek se nepodařilo propojit s diskuzí.');
 const [post]=await response.json();return /^[1-9]\d*$/.test(String(post?.id||''))?'post:'+post.id:null;
}
function fallback(root){
 let box=root.querySelector('[data-article-discussion-fallback]');if(box)return box;
 box=el('section',null,'community');box.id='diskuze';box.dataset.articleDiscussionFallback='';
 box.append(el('span','MÍSTO PRO SOUSEDY','eyebrow'),el('h2','Pojďme si o tom promluvit'),el('p','Co si o tom myslíte? Zapojte se do sousedské diskuze.','community-intro'));
 const link=el('a','Otevřít diskuzi v komunitě →','button');link.href=validKey(root.dataset.discussionKey)?topicURL(root.dataset.discussionKey):'/komunita/';box.append(link);
 const status=el('p','Načítáme komentáře…','community-status');status.setAttribute('role','status');box.append(status);
 root.insertBefore(box,root.querySelector('.detail-back-bottom'));return box;
}
export function watchArticleDiscussion(root,options={}){
 if(!root||mounted.has(root))return mounted.get(root);
 const getKey=options.resolveKey||resolveKey;
 const loadModule=options.loadModule||(()=>import('./community.js?v=20261113-independent-discussion-1'));
 let busy=false;
 async function reconcile(){
  if(busy||root.hidden||!root.querySelector('.article-body')||root.querySelector('.community:not([data-article-discussion-fallback]) h2'))return;
  for(const incomplete of root.querySelectorAll('.community:not([data-article-discussion-fallback])'))incomplete.remove();
  busy=true;const box=fallback(root),status=box.querySelector('.community-status');
  try{
   const key=await getKey(root);if(!validKey(key))throw Error('Diskuzi můžete otevřít v komunitě.');
   if(!box.isConnected)return;
   root.dataset.discussionKey=key;box.querySelector('a').href=topicURL(key);
   const module=await loadModule();if(!box.isConnected)return;
   const widget=module.mountDiscussion(root,key);if(!widget?.querySelector('h2'))throw Error('Diskuzi se nepodařilo načíst.');
   root.insertBefore(widget,root.querySelector('.detail-back-bottom'));box.remove();
  }catch{
   if(box.isConnected){status.textContent='Komentáře se nyní nepodařilo načíst. Diskuzi můžete otevřít odkazem výše nebo načítání zopakovat.';
    if(!box.querySelector('button')){const retry=el('button','Zkusit znovu','quiet');retry.type='button';retry.onclick=()=>reconcile();box.append(retry);}}
  }finally{busy=false;}
 }
 const observer=new MutationObserver(()=>reconcile());observer.observe(root,{childList:true});
 const state={reconcile,disconnect:()=>observer.disconnect()};mounted.set(root,state);reconcile();return state;
}
if(typeof document!=='undefined')watchArticleDiscussion(document.getElementById('news-detail'));
