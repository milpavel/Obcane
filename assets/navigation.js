const header=document.querySelector('.site-header'),toggle=header?.querySelector('.menu-toggle'),menu=header?.querySelector('#site-menu');
if(header&&toggle&&menu){
 const close=()=>{header.removeAttribute('data-menu-open');toggle.setAttribute('aria-expanded','false');};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));header.toggleAttribute('data-menu-open',open);if(open)header.setAttribute('data-menu-open','true');});
 menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
 document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
 const wide=matchMedia('(min-width:1101px)');wide.addEventListener('change',e=>{if(e.matches)close();});
}
