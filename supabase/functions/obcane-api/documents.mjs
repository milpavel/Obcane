// Read-only previews of PDF files already referenced by the municipal import.
export const MAX_PDF_BYTES=20*1024*1024;
export const validDocumentId=id=>/^\d{1,12}$/.test(id||'');
export async function municipalPDF(id,approved,fetcher=fetch){
 const headers={'Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
 const fail=(status,message)=>new Response(message,{status,headers});
 if(!validDocumentId(id))return fail(400,'Neplatný dokument');
 if(!approved)return fail(404,'Dokument není v přehledu portálu');
 try{
  const r=await fetcher('https://www.rtyne.cz/file/'+id,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!r.ok||!r.body)return fail(502,'Dokument se nyní nepodařilo načíst. Použijte odkaz na originál.');
  if(Number(r.headers.get('Content-Length'))>MAX_PDF_BYTES){await r.body.cancel();return fail(413,'Dokument je příliš velký pro náhled. Použijte originál.');}
  const reader=r.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_PDF_BYTES){await reader.cancel();return fail(413,'Dokument je příliš velký pro náhled. Použijte originál.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}
  if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')return fail(415,'Zdroj nevrátil PDF dokument. Použijte odkaz na originál.');
  return new Response(bytes,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'inline; filename="rtyne-'+id+'.pdf"','Cache-Control':'public, max-age=300'}});
 }catch{return fail(502,'Dokument se nyní nepodařilo načíst. Použijte odkaz na originál.');}
}
