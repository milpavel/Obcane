-- Citizen suggestions stay outside the public Data API and public news feed.
create table obcane.suggestions (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null unique,
 payload_hash text not null,
 category text not null check (category in ('doprava','prostor','zelen','poradek','kultura','jine')),
 title text not null check (char_length(title) between 5 and 120),
 message text not null check (char_length(message) between 20 and 4000),
 location text not null default '' check (char_length(location)<=180),
 contact_name text not null default '' check (char_length(contact_name)<=100),
 contact_email text not null default '' check (char_length(contact_email)<=254),
 client_hash text not null,
 status text not null default 'new' check(status in ('new','reviewing','done','closed')),
 internal_note text not null default '' check(char_length(internal_note)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index suggestions_client_created on obcane.suggestions (client_hash,created_at desc);
create index suggestions_created on obcane.suggestions (created_at desc);
alter table obcane.suggestions enable row level security;
revoke all on obcane.suggestions from public,anon,authenticated;
create table obcane.suggestion_managers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table obcane.suggestion_managers enable row level security;
revoke all on obcane.suggestion_managers from public,anon,authenticated;
-- Existing confirmed owner; grants access only to the suggestions inbox.
insert into obcane.suggestion_managers(user_id)
 select id from auth.users where lower(email)='mil.pavel@icloud.com' and email_confirmed_at is not null
 on conflict do nothing;
