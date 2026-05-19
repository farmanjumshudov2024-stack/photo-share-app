# Photo Share Real App with Remove Button

This version:
- Saves uploaded photos in Supabase Storage
- Saves photo info in Supabase Database
- Photos stay after page refresh
- Photos disappear only when someone presses Remove Photo
- Everyone sees the same public gallery

## Supabase setup

### 1. Create Storage bucket

Supabase → Storage → New bucket

Bucket name:

photos

Make it Public.

### 2. Create database table

Supabase → SQL Editor → New query

Run this:

```sql
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  url text not null,
  path text not null,
  name text,
  uploader text
);

alter table photos enable row level security;

drop policy if exists "Anyone can view photos" on photos;
drop policy if exists "Anyone can upload photo rows" on photos;
drop policy if exists "Anyone can remove photo rows" on photos;

create policy "Anyone can view photos"
on photos for select
using (true);

create policy "Anyone can upload photo rows"
on photos for insert
with check (true);

create policy "Anyone can remove photo rows"
on photos for delete
using (true);
```

### 3. Add Storage policies

Supabase → SQL Editor → New query

Run this:

```sql
drop policy if exists "Anyone can upload photos" on storage.objects;
drop policy if exists "Anyone can view photos" on storage.objects;
drop policy if exists "Anyone can remove photos" on storage.objects;

create policy "Anyone can upload photos"
on storage.objects for insert
with check (bucket_id = 'photos');

create policy "Anyone can view photos"
on storage.objects for select
using (bucket_id = 'photos');

create policy "Anyone can remove photos"
on storage.objects for delete
using (bucket_id = 'photos');
```

## Environment variables

Create `.env.local` locally or add these in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_BUCKET=photos
```

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

Upload these files to GitHub, then redeploy in Vercel.

Do not upload:
- node_modules
- .next
- .env.local