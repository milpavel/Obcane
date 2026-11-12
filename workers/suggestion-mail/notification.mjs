const encoder=new TextEncoder();
export const recipient='mil.pavel@icloud.com';
export const sender='podnety@prortyni.cz';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const b64=s=>btoa(String.fromCharCode(...encoder.encode(s)));
const header=s=>'=?UTF-8?B?'+b64(s)+'?=';
export function mailContent(s){
 if(!uuid.test(s?.id||'')||typeof s.title!=='string'||s.title.length>120||typeof s.message!=='string'||s.message.length>4000)throw Error('invalid');
 const clean=s=>String(s||'').replace(/[\r\n]/g,' ').trim();
 const created=new Date(s.created_at);if(!Number.isFinite(created.getTime()))throw Error('invalid date');
 const subject='[Pro Rtyni] Nový podnět: '+clean(s.title);
 const body=['Nový podnět z informačního portálu Pro Rtyni','',s.title,'Přijato: '+created.toLocaleString('cs-CZ',{timeZone:'Europe/Prague'}),'Číslo podnětu: '+s.id,'Téma: '+clean(s.category),'Místo: '+(clean(s.location)||'neuvedeno'),'Od: '+(clean(s.contact_name)||'anonymně'),'E-mail pro odpověď: '+(clean(s.contact_email)||'neuveden'),'',s.message,'','Podnět zůstává uložený v soukromé administraci:','https://prortyni.cz/admin/'].join('\n');
 const reply=clean(s.contact_email);const headers=['From: Pro Rtyni <'+sender+'>','To: '+recipient,'Subject: '+header(subject),'Date: '+created.toUTCString(),'Message-ID: <podnet-'+s.id+'@prortyni.cz>','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];
 if(/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(reply)&&!/[\r\n]/.test(s.contact_email||''))headers.push('Reply-To: '+reply);
 return headers.join('\r\n')+'\r\n\r\n'+b64(body).match(/.{1,76}/g).join('\r\n')+'\r\n';
}
export async function handleMail(req,secret,send){
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 if(req.headers.get('content-type')?.split(';')[0]!=='application/json')return new Response('Unsupported type',{status:415});
 if(Number(req.headers.get('content-length')||0)>32768)return new Response('Too large',{status:413});
 const reader=req.body?.getReader();if(!reader)return new Response('Missing body',{status:400});const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return new Response('Too large',{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const signature=req.headers.get('x-obcane-signature')||'';if(!secret||!/^\w{64}$/.test(signature)||!/^[0-9a-f]+$/i.test(signature))return new Response('Unauthorized',{status:401});
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),bytes))return new Response('Unauthorized',{status:401});
 try{const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!Number.isFinite(data.sent_at)||Math.abs(Date.now()/1000-data.sent_at)>300)return new Response('Expired',{status:401});const mime=mailContent(data.suggestion);await send(mime);return Response.json({ok:true});}catch(e){return Response.json({ok:false,error:'mail_failed'},{status:502});}
}
