alter table public.agents
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists voice_notes text,
  add column if not exists headline text,
  add column if not exists sub_headline text,
  add column if not exists paused boolean default false,
  add column if not exists notification_preferences jsonb default
    '{"new_lead": false, "showing_requested": true, "hot_lead": true, "weekly_summary": false}'::jsonb;

alter table public.leads
  add column if not exists temperature text check (temperature in ('hot','warm','browsing')),
  add column if not exists temperature_score int,
  add column if not exists temperature_reasons text[] default '{}',
  add column if not exists last_contacted_at timestamptz,
  add column if not exists snoozed_until timestamptz,
  add column if not exists marked_junk boolean default false,
  add column if not exists notes text,
  add column if not exists source text default 'direct';

create table if not exists public.setup_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  data jsonb not null default '{}',
  current_step text not null default 'welcome',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agent_invites (
  id uuid primary key default gen_random_uuid(),
  invited_by uuid references public.agents(id) on delete set null,
  email text not null,
  accepted boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.agent_distribution_templates (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade unique,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('headshots', 'headshots', true)
on conflict (id) do nothing;

drop policy if exists "headshots are publicly readable" on storage.objects;
create policy "headshots are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'headshots');

drop policy if exists "authenticated users can upload headshots" on storage.objects;
create policy "authenticated users can upload headshots"
on storage.objects for insert
to authenticated
with check (bucket_id = 'headshots' and owner = auth.uid());

create index if not exists agents_user_idx on public.agents (user_id);
create index if not exists leads_agent_temperature_created_idx on public.leads (agent_id, temperature, created_at desc);
create index if not exists leads_agent_last_contacted_idx on public.leads (agent_id, last_contacted_at);
create index if not exists leads_agent_snoozed_idx on public.leads (agent_id, snoozed_until) where snoozed_until is not null;
create index if not exists leads_agent_source_idx on public.leads (agent_id, source, created_at desc);

alter table public.setup_drafts enable row level security;
alter table public.agent_invites enable row level security;
alter table public.agent_distribution_templates enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists setup_drafts_updated_at on public.setup_drafts;
create trigger setup_drafts_updated_at
before update on public.setup_drafts
for each row execute function public.touch_updated_at();

drop trigger if exists agent_distribution_templates_updated_at on public.agent_distribution_templates;
create trigger agent_distribution_templates_updated_at
before update on public.agent_distribution_templates
for each row execute function public.touch_updated_at();

create or replace function public.onboard_agent(payload jsonb)
returns public.agents
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_agent public.agents;
  listing jsonb;
  notification_preferences jsonb;
begin
  delete from public.agents where slug = payload->>'slug';

  notification_preferences := coalesce(
    payload->'notificationPreferences',
    '{"new_lead": false, "showing_requested": true, "hot_lead": true, "weekly_summary": false}'::jsonb
  );

  insert into public.agents (
    user_id, slug, name, headshot_url, bio, headline, sub_headline, voice_notes,
    market, neighborhoods, phone, email, closed_volume_usd, buyers_placed,
    accent_color, paused, notification_preferences
  )
  values (
    nullif(payload->>'userId', '')::uuid,
    payload->>'slug',
    payload->>'name',
    payload->>'headshotUrl',
    payload->>'bio',
    payload->>'headline',
    payload->>'subHeadline',
    payload->>'voiceNotes',
    payload->>'market',
    array(select jsonb_array_elements_text(coalesce(payload->'neighborhoods', '[]'::jsonb))),
    payload->>'phone',
    payload->>'email',
    coalesce((payload->>'closedVolumeUsd')::bigint, 0),
    coalesce((payload->>'buyersPlaced')::int, 0),
    coalesce(payload->>'accentColor', '#C97B5C'),
    coalesce((payload->>'paused')::boolean, false),
    notification_preferences
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

revoke all on function public.onboard_agent(jsonb) from public;
revoke all on function public.onboard_agent(jsonb) from anon;
revoke all on function public.onboard_agent(jsonb) from authenticated;
grant execute on function public.onboard_agent(jsonb) to service_role;

drop policy if exists "buyer can read own match reasons" on public.lead_match_reasons;

drop policy if exists "authenticated agents can select own agents" on public.agents;
create policy "authenticated agents can select own agents"
on public.agents for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "authenticated agents can update own agents" on public.agents;
create policy "authenticated agents can update own agents"
on public.agents for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "authenticated agents can write own listings" on public.listings;
create policy "authenticated agents can write own listings"
on public.listings for all
to authenticated
using (exists (select 1 from public.agents where agents.id = listings.agent_id and agents.user_id = auth.uid()))
with check (exists (select 1 from public.agents where agents.id = listings.agent_id and agents.user_id = auth.uid()));

drop policy if exists "authenticated agents can select own leads" on public.leads;
create policy "authenticated agents can select own leads"
on public.leads for select
to authenticated
using (exists (select 1 from public.agents where agents.id = leads.agent_id and agents.user_id = auth.uid()));

drop policy if exists "authenticated agents can update own leads" on public.leads;
create policy "authenticated agents can update own leads"
on public.leads for update
to authenticated
using (exists (select 1 from public.agents where agents.id = leads.agent_id and agents.user_id = auth.uid()))
with check (exists (select 1 from public.agents where agents.id = leads.agent_id and agents.user_id = auth.uid()));

drop policy if exists "authenticated agents can select own events" on public.events;
create policy "authenticated agents can select own events"
on public.events for select
to authenticated
using (exists (select 1 from public.agents where agents.id = events.agent_id and agents.user_id = auth.uid()));

drop policy if exists "authenticated agents can select own showing requests" on public.showing_requests;
create policy "authenticated agents can select own showing requests"
on public.showing_requests for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.agents on agents.id = leads.agent_id
    where leads.id = showing_requests.lead_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "authenticated agents can select own match reasons" on public.lead_match_reasons;
create policy "authenticated agents can select own match reasons"
on public.lead_match_reasons for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.agents on agents.id = leads.agent_id
    where leads.id = lead_match_reasons.lead_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "users manage own setup draft" on public.setup_drafts;
create policy "users manage own setup draft"
on public.setup_drafts for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "agents manage own distribution templates" on public.agent_distribution_templates;
create policy "agents manage own distribution templates"
on public.agent_distribution_templates for all
to authenticated
using (exists (select 1 from public.agents where agents.id = agent_distribution_templates.agent_id and agents.user_id = auth.uid()))
with check (exists (select 1 from public.agents where agents.id = agent_distribution_templates.agent_id and agents.user_id = auth.uid()));
