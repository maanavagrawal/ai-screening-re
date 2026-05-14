import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("[railway:migrate] DATABASE_URL not set; skipping Postgres migrations.");
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

const sql = `
create extension if not exists pgcrypto;

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  slug text unique not null,
  name text not null,
  headshot_url text,
  bio text,
  headline text,
  sub_headline text,
  voice_notes text,
  market text not null,
  neighborhoods text[] default '{}',
  phone text,
  email text,
  closed_volume_usd bigint default 0,
  buyers_placed int default 0,
  accent_color text default '#C97B5C',
  paused boolean default false,
  notification_preferences jsonb default '{"new_lead": false, "showing_requested": true, "hot_lead": true, "weekly_summary": false}',
  created_at timestamptz default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  domain text unique not null,
  type text check (type in ('path','subdomain','custom')) not null,
  verified boolean default false,
  ssl_status text,
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  address text not null,
  price int not null,
  beds int not null,
  baths numeric(3,1) not null,
  sqft int,
  neighborhood text,
  property_type text,
  features text[] default '{}',
  deal_breaker_flags text[] default '{}',
  video_url text,
  video_source text check (video_source in ('instagram','tiktok','mp4')),
  description text,
  agent_note text,
  is_pocket boolean default false,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  session_id text not null,
  first_name text,
  phone text not null,
  phone_verified boolean default false,
  email text not null,
  preferences jsonb not null,
  preapproval_url text,
  free_text_raw text,
  tier text check (tier in ('captured','engaged','requested_showing','browsing')) default 'captured',
  brief jsonb,
  temperature text check (temperature in ('hot','warm','browsing')),
  temperature_score int,
  temperature_reasons text[],
  last_contacted_at timestamptz,
  snoozed_until timestamptz,
  marked_junk boolean default false,
  notes text,
  source text default 'direct',
  created_at timestamptz default now()
);

create table if not exists lead_match_reasons (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  reason text not null,
  generated_at timestamptz default now(),
  unique(lead_id, listing_id)
);

create table if not exists showing_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  preferred_date date,
  preferred_time_of_day text check (preferred_time_of_day in ('morning','afternoon','evening')),
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  lead_id uuid references leads(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists setup_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  data jsonb default '{}',
  current_step text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid references agents(id),
  email text,
  accepted boolean default false,
  created_at timestamptz default now()
);

create table if not exists agent_distribution_templates (
  agent_id uuid primary key references agents(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists agent_magic_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  token_hash text unique not null,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists events_lead_created_idx on events (lead_id, created_at desc);
create index if not exists events_agent_type_created_idx on events (agent_id, event_type, created_at desc);
create index if not exists events_session_created_idx on events (session_id, created_at desc);
create index if not exists leads_agent_created_idx on leads (agent_id, created_at desc);
create index if not exists leads_agent_tier_idx on leads (agent_id, tier);
create index if not exists leads_agent_temperature_created_idx on leads (agent_id, temperature, created_at desc);
create index if not exists leads_agent_last_contacted_idx on leads (agent_id, last_contacted_at);
create index if not exists leads_agent_snoozed_idx on leads (agent_id, snoozed_until) where snoozed_until is not null;
create index if not exists listings_agent_idx on listings (agent_id);
create index if not exists domains_domain_idx on domains (domain);
create index if not exists agent_sessions_token_idx on agent_sessions (token_hash);
create index if not exists agent_magic_links_token_idx on agent_magic_links (token_hash);
`;

try {
  await pool.query(sql);
  console.log("[railway:migrate] Postgres schema is up to date.");
} finally {
  await pool.end();
}
