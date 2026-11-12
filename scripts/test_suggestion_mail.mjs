import assert from 'node:assert/strict';
import {handleMail,mailContent,recipient} from '../workers/suggestion-mail/notification.mjs';
const suggestion={id:'12345678-1234-1234-1234-123456789012',title:'Změna údajů',message:'Prosím o změnu kontaktních údajů.',created_at:'2026-11-12T10:00:00Z',contact_name:'Test',contact_email:'reply@example.com',category:'jine',location:''};
const secret='test-only-not-a-production-secret';let sends=0;
async function request(body,signature){const raw=JSON.stringify(body),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']),sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('hex');return new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json','x-obcane-signature':signature??sig},body:raw});}
const payload={sent_at:Math.floor(Date.now()/1000),suggestion};
assert.equal((await handleMail(await request(payload,'00'.repeat(32)),secret,async()=>sends++)).status,401);assert.equal(sends,0);
assert.equal((await handleMail(await request({...payload,sent_at:payload.sent_at-1000}),secret,async()=>sends++)).status,401);
assert.equal((await handleMail(await request(payload),secret,async mime=>{assert.ok(mime.includes('To: '+recipient));assert.ok(mime.includes('Reply-To: reply@example.com'));sends++;})).status,200);assert.equal(sends,1);
assert.equal((await handleMail(await request(payload),secret,async()=>{throw Error('offline');})).status,502);
const mime=mailContent({...suggestion,title:'Nadpis\r\nBcc: attacker@example.org',contact_email:'reply@example.com\r\nBcc: attacker@example.org'});assert.ok(!/^Bcc:/m.test(mime));assert.ok(!/^Reply-To:/m.test(mime));assert.equal(mailContent(suggestion).match(/Message-ID:.*/)[0],mailContent(suggestion).match(/Message-ID:.*/)[0]);
const body=Buffer.from(mime.split('\r\n\r\n')[1].replace(/\s/g,''),'base64').toString();assert.ok(body.includes(suggestion.message));assert.ok(body.includes('https://prortyni.cz/admin/'));
assert.equal((await handleMail(new Request('https://example.com'),secret,async()=>{})).status,405);assert.equal((await handleMail(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(32769)}),secret,async()=>{})).status,413);
console.log('PASS: fixed recipient, authenticated and expiring payload, UTF-8 email, reply-to safety, stable Message-ID, provider failure and request size limit');
