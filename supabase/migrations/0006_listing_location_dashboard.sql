alter table public.listings
  add column if not exists attom_id text,
  add column if not exists property_data_source text,
  add column if not exists property_enriched_at timestamptz,
  add column if not exists property_match_confidence numeric(3,2),
  add column if not exists normalized_address jsonb,
  add column if not exists property_facts jsonb,
  add column if not exists property_override_fields text[] default '{}';

create index if not exists listings_agent_data_source_idx
on public.listings (agent_id, property_data_source);

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
      agent_note, is_pocket, attom_id, property_data_source, property_enriched_at,
      property_match_confidence, normalized_address, property_facts, property_override_fields
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
      coalesce((listing->>'isPocket')::boolean, false),
      listing->>'attomId',
      listing->>'propertyDataSource',
      nullif(listing->>'propertyEnrichedAt', '')::timestamptz,
      nullif(listing->>'propertyMatchConfidence', '')::numeric,
      listing->'normalizedAddress',
      listing->'propertyFacts',
      array(select jsonb_array_elements_text(coalesce(listing->'propertyOverrideFields', '[]'::jsonb)))
    );
  end loop;

  return inserted_agent;
end;
$$;

revoke all on function public.onboard_agent(jsonb) from public;
revoke all on function public.onboard_agent(jsonb) from anon;
revoke all on function public.onboard_agent(jsonb) from authenticated;
grant execute on function public.onboard_agent(jsonb) to service_role;
