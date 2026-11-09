const API='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-api';
const form=document.getElementById('suggestion-form'),status=document.getElementById('suggestion-status'),button=document.getElementById('suggestion-submit');
let token=null,tokenAt=0,tokenRequest=null,busy=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function show(message,kind='error'){status.textContent=message;status.className='suggestion-status '+kind;}
async function prepareToken(){
 if(token&&Date.now()-tokenAt<25*60*1000)return;
 if(!tokenRequest)tokenRequest=(async()=>{const r=await fetch(API+'?suggestions=token',{cache:'no-store',signal:AbortSignal.timeout(12000)});const data=await r.json();if(!r.ok||typeof data.token!=='string')throw Error(data.error||'Odeslání se nepodařilo připravit. Zkuste to prosím znovu.');token=data.token;tokenAt=Date.now();})().finally(()=>{tokenRequest=null;});
 await tokenRequest;
}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();prepareToken().catch(()=>{});}},{rootMargin:'200px'});observer.observe(form);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!form.reportValidity())return;busy=true;button.disabled=true;button.textContent='Odesíláme podnět…';show('Ukládáme váš podnět.','pending');
 try{
  await prepareToken();await delay(Math.max(0,2200-(Date.now()-tokenAt)));
  const fields=new FormData(form),body={token};for(const name of ['category','title','message','location','contact_name','contact_email','website'])body[name]=String(fields.get(name)||'').trim();
  const r=await fetch(API+'?suggestions=submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),data=await r.json();
  if(!r.ok||data.ok!==true||!/^[A-F0-9]{8}$/.test(data.reference||'')){if(r.status===403){token=null;prepareToken().catch(()=>{});}throw Error(data.error||'Podnět se nepodařilo uložit. Zkuste to prosím znovu.');}
  form.reset();token=null;show('Děkujeme! Podnět jsme přijali pod číslem '+data.reference+'. Pokud jste uvedli e-mail, můžeme vám na něj odpovědět.','success');prepareToken().catch(()=>{});
 }catch(error){show(error.name==='TimeoutError'||error.name==='AbortError'?'Spojení trvá příliš dlouho. Zkuste odeslání znovu; vyplněný text zůstal zachovaný.':error.message||'Odeslání se nezdařilo. Vyplněný text zůstává ve formuláři.');}
 finally{busy=false;button.disabled=false;button.replaceChildren(document.createTextNode('Odeslat podnět ↗'));status.focus({preventScroll:true});}
});
