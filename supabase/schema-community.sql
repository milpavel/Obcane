-- Private community storage. All access goes through the authenticated, bounded Edge API.
create schema if not exists community;
revoke all on schema community from public,anon,authenticated;
create table community.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 2 and 50),
 blocked boolean not null default false, notify_replies boolean not null default true,
 created_at timestamptz not null default now()
);
create table community.topics (
 id uuid primary key default gen_random_uuid(), source_key text unique not null,
 kind text not null check(kind in ('post','event','item','neighbor')),
 category text not null, title text not null check(char_length(title) between 3 and 200),
 source_url text not null, author_id uuid references community.profiles(user_id) on delete set null,
 state text not null default 'published' check(state in ('published','pending','hidden')),
 locked boolean not null default false, resolved boolean not null default false,
 pinned boolean not null default false, created_at timestamptz not null default now(),
 activity_at timestamptz not null default now()
);
create table community.comments (
 id bigint generated always as identity primary key,
 topic_id uuid not null references community.topics(id) on delete cascade,
 author_id uuid references community.profiles(user_id) on delete set null,
 parent_id bigint references community.comments(id), root_id bigint references community.comments(id),
 body text not null check(char_length(body) between 1 and 3000),
 status text not null check(status in ('pending','approved','hidden','deleted')),
 client_id uuid not null, created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null,
 moderation_reason text, unique(author_id,client_id)
);
create index community_comments_topic on community.comments(topic_id,id);
create index community_comments_author on community.comments(author_id,created_at desc);
create index community_comments_queue on community.comments(created_at desc) where reviewed_at is null and status in ('pending','approved');
create index community_comments_parent on community.comments(parent_id);
create index community_comments_root on community.comments(root_id);
create index community_topics_activity on community.topics(pinned desc,activity_at desc) where state='published';
create index community_topics_author on community.topics(author_id);
create table community.reactions (
 comment_id bigint not null references community.comments(id) on delete cascade,
 user_id uuid not null references community.profiles(user_id) on delete cascade,
 kind text not null check(kind in ('like','heart')),
 primary key(comment_id,user_id,kind)
);
create index community_reactions_user on community.reactions(user_id);
create table community.follows (
 topic_id uuid not null references community.topics(id) on delete cascade,
 user_id uuid not null references community.profiles(user_id) on delete cascade,
 created_at timestamptz not null default now(),primary key(topic_id,user_id)
);
create index community_follows_user on community.follows(user_id);
create table community.notifications (
 id bigint generated always as identity primary key,
 user_id uuid not null references community.profiles(user_id) on delete cascade,
 topic_id uuid not null references community.topics(id) on delete cascade,
 comment_id bigint not null references community.comments(id) on delete cascade,
 kind text not null check(kind in ('reply','following','approved')),
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(user_id,comment_id)
);
create index community_notifications_user on community.notifications(user_id,id desc);
create index community_notifications_topic on community.notifications(topic_id);
create index community_notifications_comment on community.notifications(comment_id);
create table community.reports (
 id bigint generated always as identity primary key,
 comment_id bigint not null references community.comments(id) on delete cascade,
 user_id uuid not null references community.profiles(user_id) on delete cascade,
 reason text not null check(char_length(reason) between 3 and 500),
 created_at timestamptz not null default now(),handled_at timestamptz,
 unique(comment_id,user_id)
);
create index community_reports_user on community.reports(user_id);
create index community_reports_open on community.reports(comment_id) where handled_at is null;
create table community.rate_limits (bucket text primary key,hits integer not null,expires_at timestamptz not null);
create index community_rate_expiry on community.rate_limits(expires_at);
create table community.moderation_log (
 id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,
 comment_id bigint references community.comments(id) on delete set null,
 topic_id uuid references community.topics(id) on delete set null,
 action text not null,reason text,created_at timestamptz not null default now()
);
create index community_mod_actor on community.moderation_log(actor);
create index community_mod_comment on community.moderation_log(comment_id);
create index community_mod_topic on community.moderation_log(topic_id);
-- Defense in depth: no browser roles can read tables, including emails or reports.
alter table community.profiles enable row level security;
alter table community.topics enable row level security;
alter table community.comments enable row level security;
alter table community.reactions enable row level security;
alter table community.follows enable row level security;
alter table community.notifications enable row level security;
alter table community.reports enable row level security;
alter table community.rate_limits enable row level security;
alter table community.moderation_log enable row level security;
revoke all on all tables in schema community from public,anon,authenticated;
revoke all on all sequences in schema community from public,anon,authenticated;

-- Reactions to the article/event/topic itself, independently of its comments.
create table community.topic_reactions (
 topic_id uuid not null references community.topics(id) on delete cascade,
 user_id uuid not null references community.profiles(user_id) on delete cascade,
 kind text not null check(kind in ('like','heart')),
 primary key(topic_id,user_id,kind)
);
create index community_topic_reactions_user on community.topic_reactions(user_id);
alter table community.topic_reactions enable row level security;
revoke all on community.topic_reactions from public,anon,authenticated;
