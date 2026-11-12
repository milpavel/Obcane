import{request,card,empty,el}from './market-shared.js?v=20261112-1';
const root=document.getElementById('market-home-grid');
if(root){try{const d=await request('action=list');if(d.items.length)root.replaceChildren(...d.items.map(card));else root.replaceChildren(empty('Vaše nabídka může být první','Máte doma něco navíc, nabízíte službu nebo hledáte pronájem? Místní inzerce propojí lidi ze Rtyně a okolí. Vložení je zdarma.'));}catch{root.replaceChildren(el('p','Inzerci se nepodařilo načíst. Otevřete samostatný přehled nebo to zkuste později.','muted'));}}
