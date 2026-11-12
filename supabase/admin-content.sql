-- Portal-only content management. No global Auth settings or other site schemas change.
create table if not exists obcane.content_overrides (
 target text primary key, data jsonb not null default '{}'::jsonb,
 active boolean not null default true, revision integer not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists obcane.section_settings (
 target text primary key, data jsonb not null default '{}'::jsonb,
 revision integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table if not exists obcane.content_history (
 id bigint generated always as identity primary key, kind text not null, target text not null,
 before_data jsonb, after_data jsonb, actor uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table obcane.content_overrides enable row level security;
alter table obcane.section_settings enable row level security;
alter table obcane.content_history enable row level security;
revoke all on obcane.content_overrides, obcane.section_settings, obcane.content_history from public,anon,authenticated;
create index if not exists obcane_history_target on obcane.content_history(kind,target,created_at desc);
alter table public.obcane_posts add column if not exists revision integer not null default 1;
alter table public.obcane_events add column if not exists revision integer not null default 1;
alter table public.obcane_finances add column if not exists revision integer not null default 1;
create table if not exists obcane.admin_recovery_rate (
 id boolean primary key default true check(id), last_requested_at timestamptz not null default '-infinity'
);
alter table obcane.admin_recovery_rate enable row level security;
revoke all on obcane.admin_recovery_rate from public,anon,authenticated;
insert into obcane.admin_recovery_rate(id) values(true) on conflict do nothing;
