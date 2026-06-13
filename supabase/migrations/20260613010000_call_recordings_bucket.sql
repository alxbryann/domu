-- Private bucket for call audio recordings (server uploads via service_role)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'call-recordings',
  'call-recordings',
  false,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Signed URLs are issued server-side with service_role; block direct client access.
drop policy if exists call_recordings_service_role_all on storage.objects;
create policy call_recordings_service_role_all
on storage.objects
for all
to service_role
using (bucket_id = 'call-recordings')
with check (bucket_id = 'call-recordings');
