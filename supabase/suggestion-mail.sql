-- Isolated to Pro Rtyni. Does not change shared Supabase Auth, SMTP or other schemas.
create table if not exists obcane.suggestion_mail_outbox (
 suggestion_id uuid primary key references obcane.suggestions(id),
 status text not null default 'pending' check(status in ('pending','sending','sent','error')),
 attempts integer not null default 0,
 request_id bigint,
 attempted_at timestamptz,
 sent_at timestamptz,
 last_error text,
 created_at timestamptz not null default now()
);
alter table obcane.suggestion_mail_outbox enable row level security;
revoke all on obcane.suggestion_mail_outbox from public,anon,authenticated;

create or replace function obcane.queue_suggestion_email() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into obcane.suggestion_mail_outbox(suggestion_id) values(new.id) on conflict do nothing;
 return new;
end $$;
revoke all on function obcane.queue_suggestion_email() from public,anon,authenticated;
drop trigger if exists obcane_queue_suggestion_email on obcane.suggestions;
create trigger obcane_queue_suggestion_email after insert on obcane.suggestions
for each row execute function obcane.queue_suggestion_email();

create or replace function obcane.dispatch_suggestion_emails() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r record; v_enabled text; v_secret text; v_body jsonb; v_id bigint; queued integer:=0;
begin
 if not pg_try_advisory_xact_lock(82416027) then return '{"busy":true}'::jsonb; end if;
 -- Only HTTP success marks a message as accepted by the email service.
 update obcane.suggestion_mail_outbox o set status='sent',sent_at=now(),last_error=null
 from net._http_response n where o.status='sending' and n.id=o.request_id and n.status_code=200;
 update obcane.suggestion_mail_outbox o set status=case when attempts>=5 then 'error' else 'pending' end,
 last_error=case when n.status_code is null then 'Dočasná chyba spojení s odesílatelem' else 'Odesílatel HTTP '||n.status_code::text end
 from net._http_response n where o.status='sending' and n.id=o.request_id and n.status_code is distinct from 200;
 update obcane.suggestion_mail_outbox set status=case when attempts>=5 then 'error' else 'pending' end,
 last_error='Nepotvrzené odeslání; opakujeme pokus' where status='sending' and attempted_at<now()-interval '3 minutes';
 select decrypted_secret into v_enabled from vault.decrypted_secrets where name='obcane_suggestion_mail_enabled';
 if v_enabled is distinct from 'true' then return '{"enabled":false,"queued":0}'::jsonb; end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='obcane_suggestion_mail_secret';
 if v_secret is null then return '{"enabled":false,"error":"missing configuration"}'::jsonb; end if;
 for r in select s.* from obcane.suggestion_mail_outbox o join obcane.suggestions s on s.id=o.suggestion_id
 where o.status='pending' and o.attempts<5 and (o.attempted_at is null or o.attempted_at<now()-interval '5 minutes')
 order by o.created_at limit 10 for update of o skip locked loop
  v_body=jsonb_build_object('sent_at',floor(extract(epoch from now())),
   'suggestion',jsonb_build_object('id',r.id,'title',r.title,'message',r.message,'category',r.category,
   'location',r.location,'contact_name',r.contact_name,'contact_email',r.contact_email,'created_at',r.created_at));
  v_id=net.http_post(url:='https://prortyni-suggestion-mail.mil-pavel.workers.dev/',
   headers:=jsonb_build_object('Content-Type','application/json','x-obcane-signature',encode(extensions.hmac(v_body::text,v_secret,'sha256'),'hex')),
   body:=v_body,timeout_milliseconds:=20000);
  update obcane.suggestion_mail_outbox set status='sending',attempts=attempts+1,request_id=v_id,attempted_at=now(),last_error=null where suggestion_id=r.id;
  queued=queued+1;
 end loop;
 return jsonb_build_object('enabled',true,'queued',queued);
end $$;
revoke all on function obcane.dispatch_suggestion_emails() from public,anon,authenticated;
grant execute on function obcane.dispatch_suggestion_emails() to service_role;

-- Backfill only unresolved citizen requests, never old technical checks.
insert into obcane.suggestion_mail_outbox(suggestion_id)
select id from obcane.suggestions where status in ('new','reviewing') on conflict do nothing;

-- Disabled until the owner authorizes Email Routing activation for prortyni.cz.
do $$ begin
 if not exists(select 1 from vault.secrets where name='obcane_suggestion_mail_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'obcane_suggestion_mail_secret','Pro Rtyni suggestion mail HMAC only');
 end if;
 if not exists(select 1 from vault.secrets where name='obcane_suggestion_mail_enabled') then
  perform vault.create_secret('false','obcane_suggestion_mail_enabled','Pro Rtyni suggestion mail activation switch');
 end if;
end $$;
select cron.schedule('obcane-suggestion-mail','* * * * *','select obcane.dispatch_suggestion_emails();');
