export class InputError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(v){if(typeof v!=='string'||!UUID.test(v))throw new InputError('Neplatný identifikátor.');return v;}
export function id(v){if(!/^[1-9][0-9]{0,15}$/.test(String(v)))throw new InputError('Neplatné číslo komentáře.');return String(v);}
export function text(v,min,max,label='Text'){if(typeof v!=='string')throw new InputError(label+' chybí.');v=v.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim();if(v.length<min||v.length>max)throw new InputError(label+': zadejte '+min+' až '+max+' znaků.');return v;}
export function source(v){if(typeof v!=='string'||! /^(post|event|item):[1-9][0-9]{0,15}$/.test(v))throw new InputError('Tady diskuze není dostupná.');return v;}
export const categories={question:'Dotaz sousedům',help:'Sousedská pomoc',tip:'Tip pro ostatní',idea:'Nápad pro Rtyni'};
export function category(v){if(!Object.hasOwn(categories,v))throw new InputError('Vyberte téma příspěvku.');return v;}
export function reaction(v){if(!['like','heart'].includes(v))throw new InputError('Neplatná reakce.');return v;}
export function content(v){const s=text(v,2,3000,'Příspěvek');if((s.match(/https?:\/\//g)||[]).length>3)throw new InputError('Do příspěvku vložte nejvýše tři odkazy.');return s;}
export function displayName(v){const s=text(v,2,50,'Zobrazované jméno');if(/@|https?:|www\.|redakce|administr[aá]tor|moder[aá]tor|pro\s*rtyni/i.test(s))throw new InputError('Zvolte osobní jméno nebo přezdívku bez e-mailu a označení redakce.');return s;}
export function offset(v){const n=Number(v||0);return Number.isSafeInteger(n)&&n>=0&&n<=1000?n:0;}
export async function readBody(req){const reader=req.body?.getReader();if(!reader)throw new InputError('Chybí data.');let n=0,out='';const decoder=new TextDecoder();while(true){const r=await reader.read();if(r.done)break;n+=r.value.byteLength;if(n>16000){await reader.cancel();throw new InputError('Příliš velký požadavek.',413);}out+=decoder.decode(r.value,{stream:true});}out+=decoder.decode();try{const obj=JSON.parse(out);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error();return obj;}catch{throw new InputError('Neplatná data.');}}
