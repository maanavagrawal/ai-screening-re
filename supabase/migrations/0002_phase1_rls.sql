alter table public.agents enable row level security;
alter table public.domains enable row level security;
alter table public.listings enable row level security;
alter table public.leads enable row level security;
alter table public.lead_match_reasons enable row level security;
alter table public.showing_requests enable row level security;
alter table public.events enable row level security;

drop policy if exists "agents are publicly readable" on public.agents;
create policy "agents are publicly readable"
on public.agents for select
to anon, authenticated
using (true);

drop policy if exists "domains are publicly readable" on public.domains;
create policy "domains are publicly readable"
on public.domains for select
to anon, authenticated
using (true);

drop policy if exists "listings are publicly readable" on public.listings;
create policy "listings are publicly readable"
on public.listings for select
to anon, authenticated
using (true);

drop policy if exists "anon can insert leads with session" on public.leads;
create policy "anon can insert leads with session"
on public.leads for insert
to anon
with check (length(session_id) > 8);

drop policy if exists "anon can insert showing requests" on public.showing_requests;
create policy "anon can insert showing requests"
on public.showing_requests for insert
to anon
with check (
  exists (
    select 1 from public.leads
    where leads.id = showing_requests.lead_id
      and length(leads.session_id) > 8
  )
);

drop policy if exists "anon can insert events" on public.events;
create policy "anon can insert events"
on public.events for insert
to anon
with check (length(session_id) > 8);

drop policy if exists "buyer can read own match reasons" on public.lead_match_reasons;
create policy "buyer can read own match reasons"
on public.lead_match_reasons for select
to anon
using (
  exists (
    select 1 from public.leads
    where leads.id = lead_match_reasons.lead_id
      and length(leads.session_id) > 8
  )
);

-- Phase 2 will add authenticated agent ownership policies once agent auth exists.
-- Service-role API routes bypass RLS for server-side inserts, updates, and scoped reads.
