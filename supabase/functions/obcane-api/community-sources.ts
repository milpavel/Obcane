// Public local organizations. A profile-only source is checked, never relabelled as news.
export const communitySources=[
 {key:'scouts',name:'Skaut – Permoník',profile:'SKAUT Rtyně',url:'https://skaut-rtyne.skauting.cz/feed/',feed:'rss'},
 {key:'orel',name:'Orel Rtyně',profile:'Orel Rtyně',url:'https://www.orelrtyne.cz/feed/',feed:'rss'},
 {key:'koletovka',name:'Koletova hornická hudba',profile:'Koletova hornická hudba Rtyně',url:'https://koletovka.cz/wp-json/wp/v2/posts?per_page=5',feed:'json'},
 {key:'bonifac',name:'TŠ Bonifác',profile:'TŠ Bonifác',url:'https://www.bonifac.eu/feed/',feed:'rss'},
 {key:'ballare',name:'TS Ballare',profile:'TS Ballare',url:'https://ballare.cz/feed/',feed:'rss',news_category:'Novinky'},
 {key:'banik',name:'TJ Baník – fotbal',profile:'TJ Baník Rtyně',url:'http://www.banikrtyne-fotbal.cz/feed/',feed:'rss'},
 {key:'hasici',name:'SDH Rtyně',profile:'SDH Rtyně',url:'https://www.facebook.com/sdhrtyne',feed:'external',note:'Aktuální příspěvky sbor zveřejňuje na Facebooku. Automatické přebírání příspěvků zatím není napojené.'},
 {key:'odolov',name:'KVH Odolov',profile:'Klub vojenské historie Odolov z.s.',url:'https://pechotni-srub-t-s-26.webnode.cz/rss/all.xml',feed:'rss'},
 {key:'florbal',name:'FBC Orel Rtyně',profile:'Orel - Florbal',url:'https://www.fbcorelrtyne.cz/',feed:'florbal'},
 {key:'volejbal',name:'TJ Baník – volejbal',profile:'TJ Baník Rtyně - volejbal',url:'https://volejbal-rtyne.estranky.cz/clanky/clanky/',feed:'estranky'},
 {key:'contemporary',name:'Contemporary Region',profile:'Contemporary Region',url:'https://contemporary.cz/cs/',feed:'local',note:'Zveřejníme pouze datované zprávy týkající se pobočky ve Rtyni.'},
 {key:'garden',name:'ČZS Rtyně',profile:'Český zahrádkářský svaz Rtyně',url:'https://www.zahradkari.cz/zo/rtyne/',feed:'local',note:'Místní web nyní obsahuje hlavně historii a kontakty; bez nových datovaných zpráv.'},
 {key:'sokol',name:'T. J. Sokol Rtyně',profile:'T. J. Sokol Rtyně',url:'https://www.sokol.eu/sokolovna/tj-sokol-rtyne-v-podkrkonosi',feed:'local',note:'Oficiální adresář obsahuje profil jednoty; datované místní novinky zatím chybí.'},
].map(s=>({...s,category:'Spolky a sport',community:true}));
export function communityPublished(value:string,czDate:any,now=new Date()):string|null{
 const full=czDate(value);if(full)return full;
 const m=value.match(/^(dnes|včera)\b/i);if(!m)return null;
 const date=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'}),d=new Date(date+'T12:00:00Z');if(m[1].toLowerCase()==='včera')d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
}
