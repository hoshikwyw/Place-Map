-- Place Map - what a visit costs, and what the place has
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- Price is two halves because places know different things about their own
-- prices. Every place can say roughly how expensive it is; far fewer will keep
-- an exact range up to date, and a stale range is worse than none. So the
-- level stands on its own, the range is optional, and either may be missing.
--
-- Amounts are per person in whole kyat, as integers. No decimals: kyat prices
-- are quoted in thousands and nobody writes 3,000.50. No currency column
-- either - the directory covers one city, and the API sends the currency from
-- a constant so clients format rather than assume. Add the column on the day a
-- second currency actually exists.
--
-- Amenities are jsonb rather than text[], matching `links` from 0005: the same
-- read path, the same hand-edit risk, and the API already filters unknown
-- entries out of a jsonb array instead of failing the whole read.

alter table places add column if not exists price_level smallint;
alter table places add column if not exists price_min integer;
alter table places add column if not exists price_max integer;
alter table places add column if not exists amenities jsonb not null default '[]'::jsonb;

-- Guard the shape here too, not only in the API: a bad row written by hand in
-- the SQL editor would otherwise reach every client.
alter table places drop constraint if exists places_price_level_range;
alter table places add constraint places_price_level_range
  check (price_level is null or price_level between 1 and 3);

alter table places drop constraint if exists places_price_amounts_positive;
alter table places add constraint places_price_amounts_positive
  check (
    (price_min is null or price_min >= 0) and
    (price_max is null or price_max >= 0)
  );

-- A range that reads backwards is a typo, and it would render as one.
alter table places drop constraint if exists places_price_range_in_order;
alter table places add constraint places_price_range_in_order
  check (price_min is null or price_max is null or price_min <= price_max);

alter table places drop constraint if exists places_amenities_is_array;
alter table places add constraint places_amenities_is_array
  check (jsonb_typeof(amenities) = 'array');

comment on column places.price_level is '1 cheap, 2 moderate, 3 expensive. Independent of price_min/price_max.';
comment on column places.price_min is 'Per person, whole kyat. Null when not stated.';
comment on column places.amenities is 'Array of known amenity slugs; see AMENITIES in @place-map/shared.';
