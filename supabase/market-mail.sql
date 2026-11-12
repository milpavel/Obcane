-- Project-scoped transactional classifieds mail. Does not change shared Auth SMTP.
alter table obcane.classifieds add column if not exists completion_state text check(completion_state in ('sold','inactive'));
alter table obcane.classifieds add column if not exists mail_version integer not null default 1;
create table if not exists obcane.market_mail_outbox (
 id uuid primary key default gen_random_uuid(), ad_id uuid not null references obcane.classifieds(id) on delete cascade,
 event text not null check(event in ('received','updated','approved','rejected','inactive','sold','expired','management')),
 version integer not null, recipient text not null, snapshot jsonb not null,
 status text not null default 'queued' check(status in ('queued','sending','sent','failed','superseded')),
 attempts integer not null default 0, created_at timestamptz not null default now(),sent_at timestamptz,
 retry_at timestamptz not null default now(),lease_until timestamptz,last_error text,
 unique(ad_id,event,version)
);
alter table obcane.market_mail_outbox enable row level security;
revoke all on obcane.market_mail_outbox from public,anon,authenticated;
create index if not exists market_mail_pending on obcane.market_mail_outbox(status,retry_at);
create table if not exists obcane.market_mail_settings (
 id boolean primary key default true check(id),enabled boolean not null default false,
 verified_at timestamptz,last_error text,updated_at timestamptz not null default now()
);
alter table obcane.market_mail_settings enable row level security;
revoke all on obcane.market_mail_settings from public,anon,authenticated;
insert into obcane.market_mail_settings(id) values(true) on conflict do nothing;
create or replace function obcane.queue_market_mail() returns trigger language plpgsql set search_path='' as $$
declare typ text;
begin
 if new.origin<>'private' then return new;end if;
 if TG_OP='INSERT' then typ:='received';
 elsif new.status is distinct from old.status then typ:=case new.status when 'published' then 'approved' when 'rejected' then 'rejected' when 'withdrawn' then case when new.completion_state='sold' then 'sold' else 'inactive' end when 'expired' then 'expired' when 'pending' then 'updated' else null end;
 elsif new.status='withdrawn' and new.completion_state is distinct from old.completion_state then typ:=case when new.completion_state='sold' then 'sold' else 'inactive' end;
 elsif new.status='pending' and (new.title,new.description,new.contact_email,new.images) is distinct from (old.title,old.description,old.contact_email,old.images) then typ:='updated';
 end if;
 if typ is null then return new;end if;
 insert into obcane.market_mail_outbox(ad_id,event,version,recipient,snapshot)
 values(new.id,typ,new.mail_version,new.contact_email,jsonb_build_object('title',new.title,'note',new.moderation_note,'expires_at',new.expires_at,'kind',new.kind)) on conflict do nothing;
 return new;
end $$;
-- AFTER trigger can enqueue using a monotonic version determined in a BEFORE trigger.
create or replace function obcane.market_mail_version() returns trigger language plpgsql set search_path='' as $$
begin new.mail_version:=old.mail_version+1;return new;end $$;
revoke all on function obcane.queue_market_mail(),obcane.market_mail_version() from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from pg_trigger where tgrelid='obcane.classifieds'::regclass and tgname='obcane_market_version') then create trigger obcane_market_version before update on obcane.classifieds for each row execute function obcane.market_mail_version();end if;
 if not exists(select 1 from pg_trigger where tgrelid='obcane.classifieds'::regclass and tgname='obcane_market_mail') then create trigger obcane_market_mail after insert or update on obcane.classifieds for each row execute function obcane.queue_market_mail();end if;
end $$;
do $$ begin
 if not exists(select 1 from vault.secrets where name='obcane_market_mail_dispatch') then
 perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'obcane_market_mail_dispatch','Pro Rtyni classifieds transactional mail dispatcher');end if;
end $$;
-- Delivery cron is enabled only after the administrator verifies SMTP credentials.
-- Existing ads are not mailed retroactively; the editor can send a management link explicitly.
