// Preserve all existing menu and shared hash links while services have focused pages.
export const sectionRoutes={doprava:'/odjezdy/',servis:'/jidelnicky/',finance:'/finance/','aktuality-lekaru':'/?zprava=280'};
if(typeof document!=='undefined'){
 const route=url=>url.origin===location.origin&&url.pathname==='/'&&!url.search?sectionRoutes[url.hash.slice(1)]:null;
 const initial=route(new URL(location.href));if(initial)location.replace(initial);
 document.addEventListener('click',e=>{if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target.closest?.('a[href]');if(!a||a.target&&a.target!=='_self')return;const target=route(new URL(a.href,location.href));if(target){e.preventDefault();location.assign(target);}});
}
