// Public, credential-free providers; cache only within the same Prague day.
let cached:any=null,until=0;
export async function dailyInfo(now=new Date()){
 const date=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Prague'});
 if(cached?.date===date&&Date.now()<until)return cached;
 const result:any={date,weather:null,nameday:null};
 await Promise.allSettled([
  (async()=>{const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.505&longitude=16.073&current=temperature_2m,apparent_temperature,weather_code&timezone=Europe%2FPrague',{signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Weather');const d=await r.json(),c=d.current;if(c?.time?.startsWith(date)&&Number.isFinite(c.temperature_2m)&&Number.isFinite(c.apparent_temperature))result.weather={time:c.time,temperature:c.temperature_2m,feels_like:c.apparent_temperature,code:c.weather_code,source:'https://open-meteo.com/'};})(),
  (async()=>{const r=await fetch('https://svatkyapi.netlify.app/api/day/'+date,{signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Nameday');const d=await r.json();if(d.date===date&&typeof d.name==='string'&&d.name.length<120)result.nameday=d.name;})()
 ]);
 cached=result;until=Date.now()+(result.weather&&result.nameday?15*60:60)*1000;return result;
}
