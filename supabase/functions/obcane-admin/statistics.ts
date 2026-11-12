import {reportRange} from './statistics-rules.mjs';
export async function statistics(sql:any,params:URLSearchParams){
 let period;try{period=reportRange(params.get('from'),params.get('to'));}catch(e){return {error:(e as Error).message};}
 const {from,to,previousFrom,previousTo}=period;
 const rows=await sql`select day::text,event,target,route,device,source,sum(n)::bigint n from obcane.analytics_daily where day between ${previousFrom}::date and ${to}::date and n>0 group by day,event,target,route,device,source order by day`;
 const [settings]=await sql`select started_at,history from obcane.analytics_settings where id=true`;
 const history=settings?.history;
 const historicalRows=(history?.rows||[]).filter((r:any)=>r.day>=previousFrom&&r.day<=to).map((r:any)=>({...r,origin:'cloudflare',n:Number(r.n)}));
 const combinedRows=[...historicalRows,...rows.map((r:any)=>({...r,origin:'portal',n:Number(r.n)}))];
 const outcomes=await sql`select 'ads' kind,count(*)::int n from obcane.classifieds where origin='private' and created_at>=(${from}::date::timestamp at time zone 'Europe/Prague') and created_at<((${to}::date+1)::timestamp at time zone 'Europe/Prague') union all select 'suggestions',count(*)::int from obcane.suggestions where created_at>=(${from}::date::timestamp at time zone 'Europe/Prague') and created_at<((${to}::date+1)::timestamp at time zone 'Europe/Prague') union all select 'subscriptions',count(*)::int from obcane.newsletter_subscribers where confirmed_at>=(${from}::date::timestamp at time zone 'Europe/Prague') and confirmed_at<((${to}::date+1)::timestamp at time zone 'Europe/Prague')`;
 const adStates=await sql`select status,count(*)::int n from obcane.classifieds where origin='private' and created_at>=(${from}::date::timestamp at time zone 'Europe/Prague') and created_at<((${to}::date+1)::timestamp at time zone 'Europe/Prague') group by status`;
 const subscribers=await sql`select frequency,count(*)::int n from obcane.newsletter_subscribers where status='active' group by frequency`;
 const topicCounts=await sql`select t.topic,count(*)::int n from obcane.newsletter_subscribers s cross join lateral unnest(s.topics) as t(topic) where s.status='active' group by t.topic order by n desc`;
 const targets=[...new Set(rows.map((r:any)=>r.route).concat(rows.filter((r:any)=>['detail_click','hero_click'].includes(r.event)).map((r:any)=>r.target)))].slice(0,300);
 const ids=targets.map(x=>new URL(String(x),'https://prortyni.cz')).map(u=>u.searchParams.get('zprava')).filter(Boolean);
 const slugs=targets.map(x=>new URL(String(x),'https://prortyni.cz')).map(u=>u.searchParams.get('clanek')).filter(Boolean);
 const ads=targets.map(x=>new URL(String(x),'https://prortyni.cz')).map(u=>u.searchParams.get('inzerat')).filter((x:any)=>/^[0-9a-f-]{36}$/.test(x||''));
 const names=await sql`select '/?zprava='||id::text route,title from obcane.items where id::text=any(${ids}::text[]) union all select '/zpravy/?clanek='||slug,title from public.obcane_posts where status='published' and slug=any(${slugs}::text[]) union all select '/inzerce/?inzerat='||id::text,title from obcane.classifieds where id::text=any(${ads}::text[]) and status in ('published','sold','expired','withdrawn')`;
 return{period,started_at:settings?.started_at,generated_at:new Date().toISOString(),history:history?{provider:history.provider,from:history.from,until:history.until,imported_at:history.imported_at,sample_interval:history.sample_interval}:null,rows:combinedRows,outcomes:Object.fromEntries(outcomes.map((x:any)=>[x.kind,x.n])),ad_states:adStates,subscribers,topic_counts:topicCounts,labels:Object.fromEntries(names.map((x:any)=>[x.route,x.title]))};
}
