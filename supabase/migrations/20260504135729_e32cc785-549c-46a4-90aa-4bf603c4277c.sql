
-- =========================================================
-- Enums
-- =========================================================
create type public.entry_scope as enum ('osnovni', 'licni', 'zajednicki');
create type public.dialect as enum (
  'prizrensko_juznomoravski',
  'svrljisko_zaplanjski',
  'timocko_luznicki',
  'kosovsko_resavski',
  'sumadijsko_vojvodjanski',
  'ostalo',
  'nepoznato'
);
create type public.app_role as enum ('admin', 'user');

-- =========================================================
-- Profiles
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- User roles (separate table to avoid recursive RLS)
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create policy "Roles are viewable by everyone"
  on public.user_roles for select using (true);

create policy "Only admins can manage roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Categories
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

create policy "Categories are viewable by everyone"
  on public.categories for select using (true);

create policy "Admins manage categories"
  on public.categories for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Updated_at trigger helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Entries (dictionary)
-- =========================================================
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  word_normalized text generated always as (lower(word)) stored,
  definition text not null,
  examples text[] not null default '{}',
  synonyms text[] not null default '{}',
  dialect public.dialect not null default 'svrljisko_zaplanjski',
  category_id uuid references public.categories(id) on delete set null,
  scope public.entry_scope not null default 'licni',
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entries_word_normalized_idx on public.entries (word_normalized);
create index entries_scope_idx on public.entries (scope);
create index entries_owner_idx on public.entries (owner_id);

alter table public.entries enable row level security;

-- Read: everyone can read osnovni & zajednicki; owner can read his licni
create policy "Public can read osnovni and zajednicki"
  on public.entries for select
  using (scope in ('osnovni','zajednicki') or owner_id = auth.uid());

-- Insert: owner must be auth.uid()
-- For 'osnovni' scope -> only admins
create policy "Users insert their own entries"
  on public.entries for insert
  with check (
    auth.uid() is not null
    and owner_id = auth.uid()
    and (
      scope in ('licni','zajednicki')
      or public.has_role(auth.uid(), 'admin')
    )
  );

create policy "Owner updates own entries"
  on public.entries for update
  using (
    owner_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

create policy "Owner deletes own entries"
  on public.entries for delete
  using (
    owner_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

create trigger entries_set_updated
  before update on public.entries
  for each row execute function public.set_updated_at();

-- =========================================================
-- Comments
-- =========================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index comments_entry_idx on public.comments (entry_id);
alter table public.comments enable row level security;

create policy "Comments are public"
  on public.comments for select using (true);

create policy "Auth users insert comments"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "Authors update own comments"
  on public.comments for update using (auth.uid() = author_id);

create policy "Authors delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id or public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Analyses
-- =========================================================
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  source_type text not null check (source_type in ('audio','text')),
  input_text text,
  audio_filename text,
  transcript text,
  detected_dialect public.dialect,
  confidence numeric,
  reasoning text,
  model text,
  created_at timestamptz not null default now()
);
create index analyses_owner_idx on public.analyses (owner_id);
alter table public.analyses enable row level security;

-- Public read of completed analyses (no PII stored beyond text user provided)
create policy "Analyses are publicly viewable"
  on public.analyses for select using (true);

create policy "Users insert own analyses"
  on public.analyses for insert
  with check (owner_id is null or owner_id = auth.uid());

create policy "Owners update own analyses"
  on public.analyses for update
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "Owners delete own analyses"
  on public.analyses for delete
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- =========================================================
-- Analysis word hits (link analyses ↔ recognized entries)
-- =========================================================
create table public.analysis_word_hits (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  matched_word text not null,
  created_at timestamptz not null default now()
);
create index hits_analysis_idx on public.analysis_word_hits (analysis_id);
alter table public.analysis_word_hits enable row level security;

create policy "Hits are publicly viewable"
  on public.analysis_word_hits for select using (true);

create policy "Anyone can insert hits for their analyses"
  on public.analysis_word_hits for insert
  with check (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and (a.owner_id is null or a.owner_id = auth.uid())
    )
  );
