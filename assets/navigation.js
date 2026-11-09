const header=document.querySelector('.site-header'),toggle=header?.querySelector('.menu-toggle'),menu=header?.querySelector('#site-menu');
if(header&&toggle&&menu){
 const wide=matchMedia('(min-width:1051px)'),groups=[...header.querySelectorAll('.nav-group-toggle')];
 const setGroup=(b,open)=>{b.setAttribute('aria-expanded',String(open));document.getElementById(b.getAttribute('aria-controls')).hidden=!open;};
 const closeGroups=()=>groups.forEach(b=>setGroup(b,false));
 const close=()=>{closeGroups();header.removeAttribute('data-menu-open');toggle.setAttribute('aria-expanded','false');};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';close();if(open){toggle.setAttribute('aria-expanded','true');header.setAttribute('data-menu-open','true');if(!wide.matches)groups.forEach(b=>setGroup(b,true));}});
 for(const b of groups){b.addEventListener('click',()=>{const open=b.getAttribute('aria-expanded')!=='true';if(wide.matches)closeGroups();setGroup(b,open);});b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setGroup(b,true);document.getElementById(b.getAttribute('aria-controls')).querySelector('a')?.focus();}});}
 menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const activeGroup=groups.find(b=>b.getAttribute('aria-expanded')==='true');if(toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}else if(activeGroup){closeGroups();activeGroup.focus();}});
 document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
 header.addEventListener('focusout',e=>{if(e.relatedTarget&&!header.contains(e.relatedTarget))close();});
 wide.addEventListener('change',close);
}
