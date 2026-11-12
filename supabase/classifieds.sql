-- Local marketplace only; no shared Auth settings or other applications changed.
create table if not exists obcane.classifieds (
 id uuid primary key default gen_random_uuid(), request_key uuid unique not null,
 payload_hash text not null, manage_hash text not null, client_hash text not null,
 category text not null check(category in ('bydleni','dum','deti','sport','elektronika','sluzby','ostatni')),
 kind text not null check(kind in ('nabizim','poptavam','daruji')),
 title text not null check(length(title) between 5 and 110),
 description text not null check(length(description) between 20 and 4000),
 location text not null, contact_name text not null, contact_email text not null, contact_phone text not null default '',
 price_mode text not null check(price_mode in ('castka','dohodou','zdarma')), price integer check(price>=0), price_note text not null default '',
 housing_type text check(housing_type in ('pronajem','prodej','spolubydleni')),disposition text not null default '',area numeric,available_from date,
 images jsonb not null default '[]'::jsonb check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=3),
 origin text not null default 'private' check(origin in ('private','municipal')),source_url text unique,deadline date,
 status text not null default 'pending' check(status in ('pending','published','rejected','withdrawn','expired')),
 moderation_note text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),published_at timestamptz,expires_at timestamptz,
 consent_at timestamptz not null default now()
);
create index if not exists obcane_classifieds_public on obcane.classifieds(status,published_at desc);
create index if not exists obcane_classifieds_rate on obcane.classifieds(client_hash,created_at desc);
alter table obcane.classifieds enable row level security;
revoke all on obcane.classifieds from public,anon,authenticated;
create table if not exists obcane.classifieds_sources (
 key text primary key,checked_at timestamptz,last_success_at timestamptz,status text not null default 'pending',message text not null default ''
);
alter table obcane.classifieds_sources enable row level security;
revoke all on obcane.classifieds_sources from public,anon,authenticated;
insert into obcane.classifieds_sources(key) values('municipal') on conflict do nothing;
-- Private bucket: images are served only through the API after visibility checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('obcane-classifieds','obcane-classifieds',false,300000,array['image/jpeg']) on conflict(id) do nothing;
-- Public queries also check expiry, so hiding never depends on a successful cron run.
select cron.schedule('obcane-classifieds-expiry','*/15 * * * *',$job$update obcane.classifieds set status='expired',updated_at=now() where status='published' and expires_at<=now();$job$);
do $$ begin
 if not exists(select 1 from vault.secrets where name='obcane_classifieds_sync') then
 perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'obcane_classifieds_sync','Pro Rtyni housing source sync only');
 end if;
end $$;
select cron.schedule('obcane-classifieds-municipal','21 5,10,15,20 * * *',$job$
select net.http_post(url:='https://dvbaihwplzwljxrtkymi.supabase.co/functions/v1/obcane-market?action=sync',headers:=jsonb_build_object('Content-Type','application/json','x-market-sync',(select decrypted_secret from vault.decrypted_secrets where name='obcane_classifieds_sync')),body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
