-- Place Map - search support
--
-- `name` and `description` are jsonb keyed by locale, so a plain ILIKE cannot
-- reach the text inside them, and PostgREST cannot express a cast in a filter.
-- This flattens every locale's values into one generated column that the API
-- can filter with a single `search_text=ilike.*query*`.
--
-- Language-agnostic on purpose: a search for "kafe" finds the Uzbek name and a
-- search for "cafe" finds the English one, without the client saying which.

create or replace function jsonb_values_text(j jsonb)
returns text
language sql
immutable
strict
parallel safe
as $$
  select coalesce(string_agg(value, ' ' order by key), '')
  from jsonb_each_text(j)
$$;

alter table places
  add column if not exists search_text text
  generated always as (
    jsonb_values_text(name)
    || ' ' || jsonb_values_text(coalesce(description, '{}'::jsonb))
    || ' ' || coalesce(address, '')
  ) stored;

-- Under ~500 places a sequential scan on this column is sub-millisecond, so no
-- index yet. Past a few thousand rows, uncomment - trigram indexes make
-- leading-wildcard ILIKE fast, which a btree cannot do.
--
-- create extension if not exists pg_trgm;
-- create index places_search_text_trgm_idx
--   on places using gin (search_text gin_trgm_ops);
