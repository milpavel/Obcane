export const categories={bydleni:'Bydlení',dum:'Dům a zahrada',deti:'Děti',sport:'Sport a volný čas',elektronika:'Elektronika',sluzby:'Služby',ostatni:'Ostatní'};
export const kinds={nabizim:'Nabízím',poptavam:'Poptávám',daruji:'Daruji'};
export const housingKinds={pronajem:'Pronájem',prodej:'Prodej',spolubydleni:'Spolubydlení'};
export class FormError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const validId=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s||'');
function text(v,max,multi=false){if(typeof v!=='string')throw new FormError('Zkontrolujte vyplněná pole.');const s=v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();if(s.length>max)throw new FormError('Některé pole je příliš dlouhé.');return multi?s:s.replace(/\s+/g,' ');}
export function validateAd(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.website)throw new FormError('Formulář se nepodařilo zpracovat.');
 const category=text(raw.category,30),kind=text(raw.kind,20),title=text(raw.title,110),description=text(raw.description,4000,true),location=text(raw.location,100),contact_name=text(raw.contact_name,80),contact_email=text(raw.contact_email,254),contact_phone=text(raw.contact_phone||'',30),housing_type=text(raw.housing_type||'',20);
 if(!Object.hasOwn(categories,category)||!Object.hasOwn(kinds,kind))throw new FormError('Vyberte kategorii a typ inzerátu.');
 if(title.length<5||description.length<20)throw new FormError('Nadpis musí mít alespoň 5 a popis 20 znaků.');
 if(location.length<2||contact_name.length<2)throw new FormError('Vyplňte místo a své jméno.');
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(contact_email))throw new FormError('Zkontrolujte kontaktní e-mail.');
 if(contact_phone&&!/^\+?[0-9 ()-]{9,25}$/.test(contact_phone))throw new FormError('Zkontrolujte telefonní číslo.');
 if(raw.consent!==true)throw new FormError('Potvrďte pravidla a zveřejnění kontaktních údajů.');
 if(category==='bydleni'&&!Object.hasOwn(housingKinds,housing_type))throw new FormError('Vyberte typ nabídky bydlení.');
 const price_mode=kind==='daruji'?'zdarma':text(raw.price_mode,20);
 if(!['castka','dohodou','zdarma'].includes(price_mode))throw new FormError('Vyberte způsob uvedení ceny.');
 const price=price_mode==='castka'?Number(raw.price):null;
 if(price_mode==='castka'&&(raw.price===''||!Number.isFinite(price)||price<0||price>100000000||Math.round(price)!==price))throw new FormError('Zadejte cenu v celých korunách.');
 const price_note=text(raw.price_note||'',150),disposition=text(raw.disposition||'',20);
 const area=category==='bydleni'&&raw.area!==''&&raw.area!=null?Number(raw.area):null;
 if(area!==null&&(!Number.isFinite(area)||area<=0||area>10000))throw new FormError('Zkontrolujte plochu v m².');
 const available_from=category==='bydleni'&&raw.available_from?text(raw.available_from,10):null;
 if(available_from&&(!/^\d{4}-\d{2}-\d{2}$/.test(available_from)||!Number.isFinite(new Date(available_from).getTime())||new Date(available_from).toISOString().slice(0,10)!==available_from))throw new FormError('Zkontrolujte datum dostupnosti.');
 return {category,kind,title,description,location,contact_name,contact_email,contact_phone,housing_type:category==='bydleni'?housing_type:null,disposition:category==='bydleni'?disposition:'',area,available_from,price_mode,price,price_note};
}
export function decodePhotos(input){
 if(!Array.isArray(input)||input.length>3)throw new FormError('Přidejte nejvýše 3 fotografie.');
 return input.map(s=>{if(typeof s!=='string'||s.length>410000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s))throw new FormError('Fotografie musí být ve formátu JPG.');let bytes;try{bytes=Uint8Array.from(atob(s.split(',')[1]),c=>c.charCodeAt(0));}catch{throw new FormError('Fotografii nelze přečíst.');}if(bytes.length>300000||bytes.length<32||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes.at(-2)!==255||bytes.at(-1)!==217)throw new FormError('Fotografii nelze zpracovat. Zvolte jiný soubor.');return bytes;});
}
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function hash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function sign(secret,s){const k=await crypto.subtle.importKey('raw',enc.encode('obcane-market-v1:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(s))));}
export async function equalHash(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
export async function issueToken(secret,origin,now=Date.now()){const data=b64(enc.encode(JSON.stringify({origin,issued:now,nonce:crypto.randomUUID()})));return data+'.'+await sign(secret,data);}
export async function verifyToken(secret,token,origin,now=Date.now()){try{if(typeof token!=='string'||token.length>800)return null;const [data,sig,...rest]=token.split('.');if(rest.length||!await equalHash(sig,await sign(secret,data)))return null;const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-data.length%4)%4)),c=>c.charCodeAt(0))));return p.origin===origin&&validId(p.nonce)&&Number.isInteger(p.issued)&&now-p.issued>=2000&&now-p.issued<=1800000?p:null;}catch{return null;}}
export function publicAd(row){const keys=['id','category','kind','title','description','location','price_mode','price','price_note','housing_type','disposition','area','available_from','contact_name','contact_email','contact_phone','images','published_at','expires_at','origin','source_url','deadline'];return Object.fromEntries(keys.map(k=>[k,row[k]??null]));}
export async function readJSON(req){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new FormError('Neplatný formát požadavku.',415);if(Number(req.headers.get('content-length')||0)>1300000)throw new FormError('Fotografie jsou příliš velké.',413);const reader=req.body?.getReader();if(!reader)throw new FormError('Chybí formulář.');const chunks=[];let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1300000){await reader.cancel();throw new FormError('Fotografie jsou příliš velké.',413);}chunks.push(value);}const bytes=new Uint8Array(total);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new FormError('Neplatný formulář.');}}
