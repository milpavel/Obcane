import {applyContent,publicContent} from './content-management.js?v=20261112-progressive-1';
import {fetchPracticalInfo,mergePracticalInfo} from './practical-info.js?v=20261110-local-services-1';
import {fetchPosterEvents,mergePosterEvents} from './poster-events.js?v=20261111-calendar-1';
const API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api';
export async function json(url,timeout=12000){const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
export function validFeed(d){return d&&Array.isArray(d.items)&&Array.isArray(d.sources);}
// Independent requests: no chained timeout and no waiting for below-fold data.
export function streamFeed(onUpdate,{detail=false,fetchJSON=json,getConfig=publicContent,getPractical=fetchPracticalInfo,getPosters=fetchPosterEvents}={}){
 let base=null,config=null,practical=null,posters=null,live=false,closed=false,readyResolve,enrichment;
 const ready=new Promise(resolve=>readyResolve=resolve),publish=()=>{if(closed||!base||!config)return;let d=base;if(practical)d=mergePracticalInfo(d,practical);if(posters)d=mergePosterEvents(d,posters);d=applyContent(d,config);onUpdate(d,{live});readyResolve(d);};
 const snapshot=fetchJSON(detail||location.pathname!=='/'?'/data/public-feed.json':'/data/home-feed.json',6000).then(d=>{if(!validFeed(d))throw Error('Invalid snapshot');if(!live){base=d;publish();}}).catch(()=>{});
 const remote=fetchJSON(API,15000).then(d=>{if(!validFeed(d))throw Error('Invalid feed');base=base?mergePracticalInfo(d,{items:base.items.filter(x=>x.payload?.local_practical||x.payload?.local_service)}):d;live=true;publish();}).catch(()=>{});
 const settings=getConfig().then(d=>{config=d;publish();});
 const extras=detail?getPractical().then(d=>{practical=d;publish();}).catch(()=>{}):Promise.resolve();
 const invitations=detail?getPosters().then(d=>{posters=d;publish();}).catch(()=>{}):Promise.resolve();
 const fallback=Promise.allSettled([snapshot,remote,settings]).then(()=>{if(!base){onUpdate(null,{error:true});readyResolve(null);}});
 const changed=event=>{config=event.detail;publish();};document.addEventListener('rtyne:config-ready',changed);
 return {ready,enrich(){return enrichment??=(async()=>{const results=await Promise.allSettled([getPractical(),getPosters()]);if(results[0].status==='fulfilled')practical=results[0].value;if(results[1].status==='fulfilled')posters=results[1].value;publish();})();},settled:Promise.allSettled([fallback,extras,invitations]),close(){closed=true;document.removeEventListener('rtyne:config-ready',changed);}};
}
