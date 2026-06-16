-- Supabase Storage setup for project attachments.
-- Run this in Supabase SQL Editor once.

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "Authenticated users can read project documents"
on storage.objects for select
to authenticated
using (bucket_id = 'project-documents');

create policy "Authenticated users can upload project documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-documents');

create policy "Authenticated users can update project documents"
on storage.objects for update
to authenticated
using (bucket_id = 'project-documents')
with check (bucket_id = 'project-documents');

create policy "Authenticated users can delete project documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-documents');
