create table if not exists snapshots (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null default now(),
  source text not null,
  count int not null default 0,
  sample jsonb not null default '[]'::jsonb
);
create index if not exists snapshots_source_time on snapshots (source, captured_at desc);

create table if not exists baselines (
  source text primary key,
  window_days int not null default 7,
  mean double precision not null default 0,
  stddev double precision not null default 0,
  samples int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists analyses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  model text not null default '',
  severity text not null default 'LOW',
  summary text not null default '',
  details jsonb not null default '{}'::jsonb
);
create index if not exists analyses_created on analyses (created_at desc);

alter table snapshots enable row level security;
alter table baselines enable row level security;
alter table analyses enable row level security;

create policy "public read snapshots" on snapshots for select using (true);
create policy "public read baselines" on baselines for select using (true);
create policy "public read analyses" on analyses for select using (true);
