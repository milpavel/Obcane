-- Metadata for original articles and our own summaries of media reports.
alter table public.obcane_posts
 add column if not exists author text not null default 'Občané pro Rtyni',
 add column if not exists source_name text,
 add column if not exists source_date date,
 add column if not exists source_refs jsonb not null default '[]'::jsonb;
-- Existing post permissions are preserved. No new editor membership is granted.
