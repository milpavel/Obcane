-- Run as the migration owner. All fixture rows and history are rolled back.
begin;
do $$
declare prefix text:='schedule-check-'||gen_random_uuid()::text;
 due_id bigint; future_id bigint; cancelled_id bigint;
 before_count integer; after_count integer;
begin
 insert into public.obcane_posts(title,slug,author,body,category,status,published_at)
 values('Scheduling test',prefix||'-due','Test','Test','original','scheduled',now()-interval '1 minute') returning id into due_id;
 insert into public.obcane_posts(title,slug,author,body,category,status,published_at)
 values('Scheduling test',prefix||'-future','Test','Test','original','scheduled',now()+interval '31 days') returning id into future_id;
 insert into public.obcane_posts(title,slug,author,body,category,status,published_at)
 values('Scheduling test',prefix||'-cancelled','Test','Test','original','scheduled',now()-interval '1 minute') returning id into cancelled_id;
 update public.obcane_posts set status='draft' where id=cancelled_id;
 -- A postponed article must not be published at its previous date.
 update public.obcane_posts set published_at=now()+interval '32 days' where id=future_id;
 execute 'set local role anon';
 select count(*) into before_count from public.obcane_posts where slug like prefix||'%';
 execute 'reset role';
 if before_count<>0 then raise exception 'Scheduled/draft article leaked through RLS'; end if;
 perform obcane.publish_scheduled_posts();
 if not exists(select 1 from public.obcane_posts where id=due_id and status='published' and revision=2) then raise exception 'Due article was not published'; end if;
 if not exists(select 1 from public.obcane_posts where id=future_id and status='scheduled') then raise exception 'Postponed article published early'; end if;
 if not exists(select 1 from public.obcane_posts where id=cancelled_id and status='draft') then raise exception 'Cancelled article published'; end if;
 if not exists(select 1 from obcane.content_history where target=due_id::text and kind='posts' and before_data->>'status'='scheduled' and after_data->>'status'='published' and actor is null) then raise exception 'Publication history missing'; end if;
 perform obcane.publish_scheduled_posts();
 if (select revision from public.obcane_posts where id=due_id)<>2 then raise exception 'Publication was not idempotent'; end if;
 execute 'set local role anon';
 select count(*) into after_count from public.obcane_posts where slug like prefix||'%';
 execute 'reset role';
 if after_count<>1 then raise exception 'Published article not publicly visible'; end if;
 if has_function_privilege('anon','obcane.publish_scheduled_posts()','execute') or has_function_privilege('authenticated','obcane.publish_scheduled_posts()','execute') then raise exception 'Publication callable by visitors'; end if;
end;
$$;
rollback;
