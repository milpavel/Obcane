// Editorial dates always use Prague time, even on a device in another time zone.
const prague=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function pragueInput(value){const d=new Date(value);return Number.isFinite(+d)?prague.format(d).replace(' ','T'):'';}
export function pragueInstant(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Vyplňte platné datum a čas zveřejnění.');
 const wall=Date.parse(value+'Z');
 // Prague uses UTC+1 in winter and UTC+2 in summer. Check both against IANA data.
 const matches=[60,120].map(offset=>new Date(wall-offset*60000)).filter(d=>Number.isFinite(+d)&&pragueInput(d)===value);
 if(!matches.length)throw Error('Tento čas v Praze neexistuje kvůli změně na letní čas. Vyberte jiný čas.');
 if(matches.length>1)throw Error('Tento čas nastává při změně na zimní čas dvakrát. Vyberte čas mimo 02:00–02:59.');
 return matches[0].toISOString();
}
export const postStateLabel=status=>({draft:'Koncept',scheduled:'Naplánováno',published:'Publikováno'}[status]||status);
