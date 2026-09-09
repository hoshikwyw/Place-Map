-- Place Map - initial schema
-- Multi-language: name/description are jsonb  {"en": "...", "uz": "..."}
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.

-- ---------------------------------------------------------------- categories
create table if not exists categories (
  id          bigserial primary key,
  slug        text not null unique,
  name        jsonb not null,          -- {"en": "Cafes", "uz": "Kafelar"}
  icon        text,                    -- emoji or icon key
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- places
create table if not exists places (
  id            bigserial primary key,
  category_id   bigint not null references categories(id) on delete restrict,
  slug          text not null unique,
  name          jsonb not null,
  description   jsonb,
  address       text,
  lat           double precision,
  lng           double precision,
  phone         text,
  website       text,
  opening_hours jsonb,                 -- {"mon": [["09:00","18:00"]], "sun": []}
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- place_images
create table if not exists place_images (
  id               bigserial primary key,
  place_id         bigint not null references places(id) on delete cascade,
  storage_path     text not null,      -- ImageKit path, for web + native
  telegram_file_id text,               -- filled lazily on first bot send
  width            int,
  height           int,
  sort_order       int not null default 0
);

-- ------------------------------------------------------------------ indexes
create index if not exists places_category_active_sort_idx
  on places (category_id, is_active, sort_order);
create index if not exists place_images_place_sort_idx
  on place_images (place_id, sort_order);
create index if not exists categories_active_sort_idx
  on categories (is_active, sort_order);

-- ------------------------------------------------------- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists places_set_updated_at on places;
create trigger places_set_updated_at
  before update on places
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------- RLS
-- The Worker talks to Postgres with the service_role key, which bypasses RLS.
-- Enabling RLS with no policies means the anon key can read nothing, so a
-- leaked anon key in the web app is harmless. All reads go through the API.
alter table categories   enable row level security;
alter table places       enable row level security;
alter table place_images enable row level security;
