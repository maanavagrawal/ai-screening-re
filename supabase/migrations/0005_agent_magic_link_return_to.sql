-- Supabase Auth remains optional legacy compatibility. Railway/Postgres is the
-- primary auth store; only mirror the return target column when this legacy
-- compatibility table already exists.
do $$
begin
  if to_regclass('public.agent_magic_links') is not null then
    alter table public.agent_magic_links
      add column if not exists return_to text;
  end if;
end $$;
