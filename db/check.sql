-- Place Map - has every migration actually run?
--
-- Paste the whole file into Supabase Studio -> SQL Editor -> Run, or:
--   psql "$DATABASE_URL" -f db/check.sql
--
-- Reads nothing but the catalog and writes nothing at all, so it is safe to
-- run against production at any time, including mid-deploy.
--
-- There is no migrations table in this project: migrations are run by hand in
-- the SQL editor, and a table recording that they ran would record only that
-- somebody said so. This asks the database what it actually has instead, which
-- is also the version that survives a restore from a backup taken halfway
-- through a deploy.
--
-- Two sections come back. Read the first; the second is only there to tell you
-- what to do about it.

-- ---------------------------------------------------------------- section 1
-- Every object each migration is supposed to leave behind.

with expected (migration, kind, parent, object, why) as (values
  -- 0001_init
  ('0001_init',              'table',      '-',          'categories',       'Categories, the top level of the directory'),
  ('0001_init',              'table',      '-',          'places',           'Places themselves'),
  ('0001_init',              'table',      '-',          'place_images',     'Photos attached to a place'),
  ('0001_init',              'index',      '-',          'places_category_active_sort_idx', 'Makes a category page fast'),
  ('0001_init',              'index',      '-',          'categories_active_sort_idx',      'Makes the category list fast'),
  ('0001_init',              'function',   '-',          'set_updated_at',   'Keeps places.updated_at honest'),

  -- 0002_search
  ('0002_search',            'column',     'places',     'search_text',      'What /v1/search matches against'),
  ('0002_search',            'function',   '-',          'jsonb_values_text','Flattens every language into search_text'),

  -- 0003_category_icon_image
  ('0003_category_icon',     'column',     'categories', 'icon_image',       'Uploaded category icon'),

  -- 0004_ratings_and_reviews
  ('0004_ratings',           'column',     'places',     'rating',           'The average shown beside a place'),
  ('0004_ratings',           'column',     'places',     'rating_count',     'How many ratings that average rests on'),
  ('0004_ratings',           'table',      '-',          'reviews',          'Reviews (the write endpoint is not built yet)'),
  ('0004_ratings',           'function',   '-',          'refresh_place_rating', 'Recomputes a place rating from its reviews'),

  -- 0005_place_links
  ('0005_place_links',       'column',     'places',     'links',            'Facebook, Instagram, Viber and the rest'),
  ('0005_place_links',       'constraint', 'places',     'places_links_is_array', 'Stops a non-array reaching a client'),

  -- 0006_price_and_amenities
  ('0006_price_amenities',   'column',     'places',     'price_level',      'Inexpensive / Moderate / Expensive'),
  ('0006_price_amenities',   'column',     'places',     'price_min',        'Lower end of the price range'),
  ('0006_price_amenities',   'column',     'places',     'price_max',        'Upper end of the price range'),
  ('0006_price_amenities',   'column',     'places',     'amenities',        'Amenity slugs the place carries'),
  ('0006_price_amenities',   'constraint', 'places',     'places_price_level_range',    'Keeps the level within 1-3'),
  ('0006_price_amenities',   'constraint', 'places',     'places_amenities_is_array',   'Stops a non-array reaching a client'),

  -- 0007_amenities_table
  ('0007_amenities_table',   'table',      '-',          'amenities',        'The catalog that turns slugs into words'),

  -- 0008_amenity_icon_image
  ('0008_amenity_icon',      'column',     'amenities',  'icon_image',       'Uploaded amenity icon'),

  -- 0009_suggestions
  ('0009_suggestions',       'table',      '-',          'suggestions',      'What visitors send in from the website'),
  ('0009_suggestions',       'index',      '-',          'suggestions_status_created_idx', 'Opens the queue on the unread ones'),

  -- 0010_reviews_live
  ('0010_reviews_live',      'trigger',    'reviews',    'reviews_update_place_rating', 'Recomputes a place rating when a review is published'),
  ('0010_reviews_live',      'index',      '-',          'reviews_pending_idx', 'Opens the queue on the ones waiting'),
  ('0010_reviews_live',      'default',    'reviews',    'is_published',     'Reviews are held until an editor approves them')
),

found as (
  select
    e.migration,
    e.kind,
    e.parent,
    e.object,
    e.why,
    case e.kind
      when 'table' then exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = e.object
      )
      when 'column' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = e.parent and column_name = e.object
      )
      when 'index' then exists (
        select 1 from pg_indexes
        where schemaname = 'public' and indexname = e.object
      )
      when 'function' then exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = e.object
      )
      when 'constraint' then exists (
        select 1 from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public' and t.relname = e.parent and c.conname = e.object
      )
      when 'trigger' then exists (
        select 1 from pg_trigger g
        join pg_class t on t.oid = g.tgrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public' and t.relname = e.parent and g.tgname = e.object
          and not g.tgisinternal
      )
      -- Not "does the column exist" but "does it default to false": 0004
      -- published on arrival and 0010 is the migration that stopped it, so
      -- the default is the thing worth checking.
      when 'default' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = e.parent and column_name = e.object
          and column_default = 'false'
      )
    end as present
  from expected e
)

select
  case when present then 'ok' else 'MISSING' end            as status,
  migration,
  kind,
  case when parent = '-' then object else parent || '.' || object end as object,
  why
from found
-- Missing first, because that is the only part anybody reads.
order by present asc, migration asc, kind asc, object asc;


-- ---------------------------------------------------------------- section 2
-- One line per migration: run it, or do not.

with expected (migration, kind, parent, object) as (values
  ('0001_init.sql',                   'table',      '-',          'categories'),
  ('0001_init.sql',                   'table',      '-',          'places'),
  ('0001_init.sql',                   'table',      '-',          'place_images'),
  ('0002_search.sql',                 'column',     'places',     'search_text'),
  ('0003_category_icon_image.sql',    'column',     'categories', 'icon_image'),
  ('0004_ratings_and_reviews.sql',    'column',     'places',     'rating'),
  ('0004_ratings_and_reviews.sql',    'table',      '-',          'reviews'),
  ('0005_place_links.sql',            'column',     'places',     'links'),
  ('0006_price_and_amenities.sql',    'column',     'places',     'price_level'),
  ('0006_price_and_amenities.sql',    'column',     'places',     'amenities'),
  ('0007_amenities_table.sql',        'table',      '-',          'amenities'),
  ('0008_amenity_icon_image.sql',     'column',     'amenities',  'icon_image'),
  ('0009_suggestions.sql',            'table',      '-',          'suggestions'),
  ('0010_reviews_live.sql',           'trigger',    'reviews',    'reviews_update_place_rating')
),

found as (
  select
    e.migration,
    case e.kind
      when 'table' then exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = e.object
      )
      when 'column' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = e.parent and column_name = e.object
      )
      when 'trigger' then exists (
        select 1 from pg_trigger g
        join pg_class t on t.oid = g.tgrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public' and t.relname = e.parent and g.tgname = e.object
          and not g.tgisinternal
      )
    end as present
  from expected e
)

select
  migration                                            as "run next, in this order",
  case when bool_and(present) then 'done' else 'NOT RUN' end as status,
  case
    when bool_and(present) then ''
    else 'Open db/migrations/' || migration || ' and run it'
  end                                                  as what_to_do
from found
group by migration
order by migration;


-- ---------------------------------------------------------------- section 3
-- Is there anything to show? A perfectly migrated database with no rows in it
-- serves an empty directory, which looks identical to a broken one.
--
-- Every count goes through query_to_xml so that this section still runs on a
-- database where 0001 has not been run. A plain `select count(*) from places`
-- would fail when the file is *parsed*, taking sections 1 and 2 down with it -
-- and those are the sections that would have told you why.

create or replace function pg_temp.count_rows(statement text, table_name text)
returns bigint language sql as $$
  select case
    when to_regclass(table_name) is null then null
    else (xpath('/row/c/text()', query_to_xml(statement, false, true, '')))[1]::text::bigint
  end
$$;

select
  pg_temp.count_rows('select count(*) c from categories where is_active', 'public.categories')
    as live_categories,
  pg_temp.count_rows('select count(*) c from places where is_active', 'public.places')
    as live_places,
  pg_temp.count_rows('select count(*) c from place_images', 'public.place_images')
    as photos,
  pg_temp.count_rows('select count(*) c from places where name ? ''my''', 'public.places')
    as named_in_myanmar,
  pg_temp.count_rows(
    'select count(*) c from places where is_active and coalesce(jsonb_array_length(amenities), 0) > 0',
    'public.places')
    as with_amenities,
  pg_temp.count_rows('select count(*) c from places where is_active and price_level is not null', 'public.places')
    as with_a_price,
  pg_temp.count_rows('select count(*) c from suggestions where status = ''new''', 'public.suggestions')
    as unread_suggestions,
  pg_temp.count_rows('select count(*) c from reviews where not is_published', 'public.reviews')
    as reviews_waiting,
  pg_temp.count_rows('select count(*) c from reviews where is_published', 'public.reviews')
    as reviews_published;
