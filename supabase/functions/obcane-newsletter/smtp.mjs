// Fixed SMTP destination with TLS certificate validation. No configurable host or relay.
export class MailError extends Error{constructor(code){super(code);this.code=code;}}
export async function sendSMTP(password,{to,mime},connect=opts=>Deno.connectTls(opts)){
 if(typeof password!=='string'||password.length<6||password.length>500)throw new MailError('smtp_not_configured');
 if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(to)||/[\r\n]/.test(to))throw new MailError('invalid_recipient');
 let conn,timer,aborted=false;const operation=(async()=>{conn=await connect({hostname:'smtp.seznam.cz',port:465});if(aborted){conn.close();throw new MailError('smtp_timeout');}const enc=new TextEncoder(),dec=new TextDecoder();let pending='';
 async function write(s){const bytes=enc.encode(s);let n=0;while(n<bytes.length){const len=await conn.write(bytes.subarray(n));if(!len)throw new MailError('smtp_connection');n+=len;}}
 async function reply(expected,label){let total=0;for(;;){let pos=pending.indexOf('\r\n');while(pos<0){const buf=new Uint8Array(2048),n=await conn.read(buf);if(n===null)throw new MailError('smtp_connection');pending+=dec.decode(buf.subarray(0,n));if(pending.length>16000)throw new MailError('smtp_response');pos=pending.indexOf('\r\n');}const line=pending.slice(0,pos);pending=pending.slice(pos+2);total+=line.length;if(total>64000||!/^\d{3}[ -]/.test(line))throw new MailError('smtp_response');const code=Number(line.slice(0,3));if(!expected.includes(code))throw new MailError(label+'_'+code);if(line[3]===' ')return code;}}
 const command=async(s,c,l)=>{await write(s+'\r\n');await reply(c,l);};
 await reply([220],'smtp_greeting');await command('EHLO prortyni.cz',[250],'smtp_ehlo');
 const auth=btoa(String.fromCharCode(...enc.encode('\0redakce@prortyni.cz\0'+password)));
 await command('AUTH PLAIN '+auth,[235],'smtp_auth');await command('MAIL FROM:<redakce@prortyni.cz>',[250],'smtp_sender');await command('RCPT TO:<'+to+'>',[250,251],'smtp_recipient');await command('DATA',[354],'smtp_data');
 await write(mime.replace(/\r?\n/g,'\r\n').replace(/^\./gm,'..').replace(/\r\n$/,'')+'\r\n.\r\n');await reply([250],'smtp_delivery');
 // The DATA acceptance is authoritative. A failed QUIT must not resend an accepted mail.
 try{await write('QUIT\r\n');}catch{}return {accepted:true};
 })();try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{aborted=true;try{conn?.close();}catch{}reject(new MailError('smtp_timeout'));},25000);})]);}catch(e){if(e instanceof MailError)throw e;throw new MailError('smtp_connection');}finally{clearTimeout(timer);try{conn?.close();}catch{}}
}
