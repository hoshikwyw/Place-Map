-- Place-Map - has every migration actually run?
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
-- Everything comes back as ONE table, the things to do first. That is not a
-- style choice: the Supabase SQL editor shows only the last result set, so an
-- earlier version of this file that returned three of them returned two into
-- the void - including the one naming the migration still to run.
--
-- Read the top. If the first rows say "done", there is nothing to do.

-- The row counts have to work on a database where nothing has been migrated,
-- which is the moment this file matters most. A plain `select count(*) from
-- places` fails when the file is *parsed*, taking the migration report down
-- with it, so the counts go through query_to_xml and are planned at run time.
create or replace function pg_temp.count_rows(statement text, table_name text)
returns bigint language sql as $$
  select case
    when to_regclass(table_name) is null then null
    else (xpath('/row/c/text()', query_to_xml(statement, false, true, '')))[1]::text::bigint
  end
$$;

with expected (migration, file, kind, parent, object, why) as (values
  -- 0001_init
  ('0001_init', '0001_init.sql', 'table',    '-', 'categories',   'Categories, the top level of the directory'),
  ('0001_init', '0001_init.sql', 'table',    '-', 'places',       'Places themselves'),
  ('0001_init', '0001_init.sql', 'table',    '-', 'place_images', 'Photos attached to a place'),
  ('0001_init', '0001_init.sql', 'index',    '-', 'places_category_active_sort_idx', 'Makes a category page fast'),
  ('0001_init', '0001_init.sql', 'index',    '-', 'categories_active_sort_idx',      'Makes the category list fast'),
  ('0001_init', '0001_init.sql', 'function', '-', 'set_updated_at', 'Keeps places.updated_at honest'),

  -- 0002_search
  ('0002_search', '0002_search.sql', 'column',   'places', 'search_text',       'What /v1/search matches against'),
  ('0002_search', '0002_search.sql', 'function', '-',      'jsonb_values_text', 'Flattens every language into search_text'),

  -- 0003_category_icon_image
  ('0003_category_icon', '0003_category_icon_image.sql', 'column', 'categories', 'icon_image', 'Uploaded category icon'),

  -- 0004_ratings_and_reviews
  ('0004_ratings', '0004_ratings_and_reviews.sql', 'column',   'places', 'rating',       'The average shown beside a place'),
  ('0004_ratings', '0004_ratings_and_reviews.sql', 'column',   'places', 'rating_count', 'How many ratings that average rests on'),
  ('0004_ratings', '0004_ratings_and_reviews.sql', 'table',    '-',      'reviews',      'The reviews themselves'),
  ('0004_ratings', '0004_ratings_and_reviews.sql', 'function', '-',      'refresh_place_rating', 'Recomputes a place rating from its reviews'),

  -- 0005_place_links
  ('0005_place_links', '0005_place_links.sql', 'column',     'places', 'links',                 'Facebook, Instagram, Viber and the rest'),
  ('0005_place_links', '0005_place_links.sql', 'constraint', 'places', 'places_links_is_array', 'Stops a non-array reaching a client'),

  -- 0006_price_and_amenities
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'column',     'places', 'price_level', 'Inexpensive / Moderate / Expensive'),
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'column',     'places', 'price_min',   'Lower end of the price range'),
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'column',     'places', 'price_max',   'Upper end of the price range'),
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'column',     'places', 'amenities',   'Amenity slugs the place carries'),
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'constraint', 'places', 'places_price_level_range',  'Keeps the level within 1-3'),
  ('0006_price_amenities', '0006_price_and_amenities.sql', 'constraint', 'places', 'places_amenities_is_array', 'Stops a non-array reaching a client'),

  -- 0007_amenities_table
  ('0007_amenities_table', '0007_amenities_table.sql', 'table', '-', 'amenities', 'The catalog that turns slugs into words'),

  -- 0008_amenity_icon_image
  ('0008_amenity_icon', '0008_amenity_icon_image.sql', 'column', 'amenities', 'icon_image', 'Uploaded amenity icon'),

  -- 0009_suggestions
  ('0009_suggestions', '0009_suggestions.sql', 'table', '-', 'suggestions',                    'What visitors send in from the website'),
  ('0009_suggestions', '0009_suggestions.sql', 'index', '-', 'suggestions_status_created_idx', 'Opens the queue on the unread ones'),

  -- 0010_reviews_live
  ('0010_reviews_live', '0010_reviews_live.sql', 'trigger', 'reviews', 'reviews_update_place_rating', 'Recomputes a place rating when a review is published'),
  ('0010_reviews_live', '0010_reviews_live.sql', 'index',   '-',       'reviews_pending_idx',         'Opens the queue on the ones waiting'),
  ('0010_reviews_live', '0010_reviews_live.sql', 'default', 'reviews', 'is_published',                'Reviews are held until an editor approves them')
),

found as (
  select
    e.*,
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
      -- published reviews on arrival, and 0010 is the migration that stopped
      -- it, so the default is the thing worth checking.
      when 'default' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = e.parent and column_name = e.object
          and column_default = 'false'
      )
    end as present
  from expected e
),

/** One line per migration file: run it, or do not. */
migrations as (
  select file, bool_and(present) as done
  from found
  group by file
),

contents as (
  select * from (values
    ('live categories',    pg_temp.count_rows('select count(*) c from categories where is_active', 'public.categories')),
    ('live places',        pg_temp.count_rows('select count(*) c from places where is_active', 'public.places')),
    ('photos',             pg_temp.count_rows('select count(*) c from place_images', 'public.place_images')),
    ('named in Myanmar',   pg_temp.count_rows('select count(*) c from places where name ? ''my''', 'public.places')),
    ('with amenities',     pg_temp.count_rows('select count(*) c from places where is_active and coalesce(jsonb_array_length(amenities), 0) > 0', 'public.places')),
    ('with a price',       pg_temp.count_rows('select count(*) c from places where is_active and price_level is not null', 'public.places')),
    ('suggestions unread', pg_temp.count_rows('select count(*) c from suggestions where status = ''new''', 'public.suggestions')),
    ('reviews waiting',    pg_temp.count_rows('select count(*) c from reviews where not is_published', 'public.reviews')),
    ('reviews published',  pg_temp.count_rows('select count(*) c from reviews where is_published', 'public.reviews'))
  ) as t (item, total)
),

report as (
  -- 1. Migrations still to run: the only rows that are an instruction.
  select 1 as sort, 'RUN THIS' as status, file as item,
         'Open db/migrations/' || file || ' and run it' as detail
  from migrations where not done

  union all

  -- 2. Exactly what each of those is missing, so a half-applied migration is
  --    visible rather than just "not run".
  select 2, 'missing',
         case when parent = '-' then object else parent || '.' || object end,
         migration || ' - ' || why
  from found where not present

  union all

  -- 3. The migrations that are done, so "nothing to do" is something you can
  --    see rather than infer from an empty result.
  select 3, 'done', file, ''
  from migrations where done

  union all

  -- 4. What is actually in there. A perfectly migrated database with no rows
  --    serves an empty directory, which from outside is indistinguishable
  --    from a broken one. A blank total means that table does not exist yet.
  select 4, coalesce(total::text, '-'), item,
         case when total is null then 'that table does not exist yet' else '' end
  from contents
)

select status, item, detail
from report
order by sort, item;
