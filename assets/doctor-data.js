// Public anonymous project key, used only for the platform's JWT check.
const ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YmFpaHdwbHp3bGp4cnRreW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTkwNDQsImV4cCI6MjEwMTQ5NTA0NH0.vRTWB3KLLY4djCsUuWxwpCLkJrpPIXaAngdeGq3vDH8";
const URL='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-doctor-news';
let pending=null,until=0;
export function fetchDoctorAnnouncements(){
 if(pending&&Date.now()<until)return pending;
 until=Date.now()+60000;
 pending=fetch(URL,{headers:{Authorization:'Bearer '+ANON,apikey:ANON},cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('Doctor notices unavailable');return r.json();}).then(d=>{if(!Array.isArray(d.doctors))throw Error('Invalid doctor notices');return d;}).catch(e=>{pending=null;until=0;throw e;});return pending;
}
