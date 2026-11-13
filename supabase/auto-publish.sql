-- Immediate publication with retrospective moderation. Existing removals remain blocked.
alter table obcane.classifieds add column if not exists moderation_locked boolean not null default false;
alter table obcane.classifieds alter column status set default 'published';
update obcane.classifieds set moderation_locked=true
 where status='rejected' or (status='withdrawn' and completion_state is null);
create or replace function obcane.queue_market_mail() returns trigger language plpgsql set search_path='' as $$
declare typ text;
begin
 if new.origin<>'private' then return new;end if;
 if TG_OP='INSERT' then typ:='received';
 elsif new.status is distinct from old.status then typ:=case new.status when 'published' then 'approved' when 'rejected' then 'rejected' when 'withdrawn' then case when new.completion_state='sold' then 'sold' else 'inactive' end when 'expired' then 'expired' when 'pending' then 'updated' else null end;
 elsif new.status='withdrawn' and new.completion_state is distinct from old.completion_state then typ:=case when new.completion_state='sold' then 'sold' else 'inactive' end;
 elsif new.status in ('pending','published') and (new.title,new.description,new.contact_email,new.images) is distinct from (old.title,old.description,old.contact_email,old.images) then typ:='updated';
 end if;
 if typ is null then return new;end if;
 insert into obcane.market_mail_outbox(ad_id,event,version,recipient,snapshot)
 values(new.id,typ,new.mail_version,new.contact_email,jsonb_build_object('title',new.title,'note',new.moderation_note,'expires_at',new.expires_at,'kind',new.kind)) on conflict do nothing;
 return new;
end $$;

-- Apply the same policy to work already awaiting review, never to hidden/blocked content.
update community.comments c set status='approved'
 from community.profiles p,community.topics t
 where c.author_id=p.user_id and c.topic_id=t.id and c.status='pending'
 and not p.blocked and t.state<>'hidden';
update community.topics t set state='published',activity_at=now()
 where t.state='pending' and exists(select 1 from community.comments c where c.topic_id=t.id and c.status='approved');
update obcane.classifieds set status='published',published_at=now(),expires_at=now()+interval '30 days',updated_at=now()
 where status='pending' and origin='private' and not moderation_locked;
