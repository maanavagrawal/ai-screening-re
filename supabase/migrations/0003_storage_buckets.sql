insert into storage.buckets (id, name, public)
values ('preapprovals', 'preapprovals', false)
on conflict (id) do nothing;

drop policy if exists "preapprovals are private" on storage.objects;
create policy "preapprovals are private"
on storage.objects for select
to authenticated
using (bucket_id = 'preapprovals');
