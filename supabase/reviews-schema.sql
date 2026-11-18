create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 20 and 1200),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
revoke all on table public.reviews from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.reviews to service_role;
