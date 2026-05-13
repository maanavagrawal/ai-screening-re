create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  headshot_url text,
  bio text,
  market text not null,
  neighborhoods text[] default '{}',
  phone text,
  email text,
  closed_volume_usd bigint default 0,
  buyers_placed int default 0,
  accent_color text default '#C97B5C',
  created_at timestamptz default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  domain text unique not null,
  type text check (type in ('path','subdomain','custom')) not null,
  verified boolean default false,
  ssl_status text,
  created_at timestamptz default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
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

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
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
  created_at timestamptz default now()
);

create table if not exists public.lead_match_reasons (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reason text not null,
  generated_at timestamptz default now(),
  unique(lead_id, listing_id)
);

create table if not exists public.showing_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  preferred_date date,
  preferred_time_of_day text check (preferred_time_of_day in ('morning','afternoon','evening')),
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  lead_id uuid references public.leads(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists events_lead_created_idx on public.events (lead_id, created_at desc);
create index if not exists events_agent_type_created_idx on public.events (agent_id, event_type, created_at desc);
create index if not exists events_session_created_idx on public.events (session_id, created_at desc);
create index if not exists leads_agent_created_idx on public.leads (agent_id, created_at desc);
create index if not exists leads_agent_tier_idx on public.leads (agent_id, tier);
create index if not exists listings_agent_idx on public.listings (agent_id);
create index if not exists domains_domain_idx on public.domains (domain);

create or replace function public.onboard_agent(payload jsonb)
returns public.agents
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_agent public.agents;
  listing jsonb;
begin
  delete from public.agents where slug = payload->>'slug';

  insert into public.agents (
    slug, name, headshot_url, bio, market, neighborhoods, phone, email,
    closed_volume_usd, buyers_placed, accent_color
  )
  values (
    payload->>'slug',
    payload->>'name',
    payload->>'headshotUrl',
    payload->>'bio',
    payload->>'market',
    array(select jsonb_array_elements_text(coalesce(payload->'neighborhoods', '[]'::jsonb))),
    payload->>'phone',
    payload->>'email',
    coalesce((payload->>'closedVolumeUsd')::bigint, 0),
    coalesce((payload->>'buyersPlaced')::int, 0),
    coalesce(payload->>'accentColor', '#C97B5C')
  )
  returning * into inserted_agent;

  insert into public.domains (agent_id, domain, type, verified)
  values (inserted_agent.id, 'yourapp.com/' || inserted_agent.slug, 'path', true);

  for listing in select * from jsonb_array_elements(coalesce(payload->'listings', '[]'::jsonb))
  loop
    insert into public.listings (
      agent_id, address, price, beds, baths, sqft, neighborhood, property_type,
      features, deal_breaker_flags, video_url, video_source, description,
      agent_note, is_pocket
    )
    values (
      inserted_agent.id,
      listing->>'address',
      (listing->>'price')::int,
      (listing->>'beds')::int,
      (listing->>'baths')::numeric,
      nullif(listing->>'sqft', '')::int,
      listing->>'neighborhood',
      listing->>'property_type',
      array(select jsonb_array_elements_text(coalesce(listing->'features', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(listing->'dealBreakerFlags', '[]'::jsonb))),
      listing->>'videoUrl',
      listing->>'videoSource',
      listing->>'description',
      listing->>'agent_note',
      coalesce((listing->>'isPocket')::boolean, false)
    );
  end loop;

  return inserted_agent;
end;
$$;
