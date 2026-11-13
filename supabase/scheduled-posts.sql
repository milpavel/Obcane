-- Scheduled main news stays private until the database clock reaches published_at.
alter table public.obcane_posts drop constraint obcane_posts_status_check;
alter table public.obcane_posts add constraint obcane_posts_status_check
 check(status in ('draft','scheduled','published'));
alter table public.obcane_posts add constraint obcane_posts_scheduled_complete
 check(status <> 'scheduled' or (
  published_at is not null and isfinite(published_at)
  and nullif(btrim(body),'') is not null
  and nullif(btrim(author),'') is not null
  and nullif(btrim(title),'') is not null
  and nullif(btrim(slug),'') is not null
 ));
create index obcane_posts_scheduled_due on public.obcane_posts(published_at)
 where status='scheduled';

create function obcane.publish_scheduled_posts() returns integer
 language plpgsql security invoker set search_path='' as $$
declare previous public.obcane_posts%rowtype;
 saved public.obcane_posts%rowtype;
 total integer:=0;
begin
 for previous in select * from public.obcane_posts
  where status='scheduled' and published_at<=now()
  order by published_at,id for update skip locked
 loop
  update public.obcane_posts set status='published',revision=revision+1
   where id=previous.id returning * into saved;
  insert into obcane.content_history(kind,target,before_data,after_data,actor)
   values('posts',saved.id::text,to_jsonb(previous),to_jsonb(saved),null);
  total:=total+1;
 end loop;
 return total;
end;
$$;
-- Only the existing privileged database scheduler may run publication.
revoke all on function obcane.publish_scheduled_posts() from public,anon,authenticated;
select cron.schedule('obcane-publish-scheduled-posts','* * * * *',
 'select obcane.publish_scheduled_posts();');
