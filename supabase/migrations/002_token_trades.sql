create table if not exists token_trades (
  signature text primary key,
  time timestamptz not null,
  price double precision not null,
  side text not null default ''
);
alter table token_trades enable row level security;
create policy "public read token_trades" on token_trades for select using (true);
