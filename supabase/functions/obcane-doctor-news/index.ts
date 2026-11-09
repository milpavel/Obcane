import {doctorNews} from './doctor-news.ts';
// Independent read-only public-information endpoint. No database or secret access.
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:cors});
 return new Response(JSON.stringify(await doctorNews()),{headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
});
