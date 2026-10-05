-- Place Map - ratings now, reviews ready for later
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.

-- ------------------------------------------------------------------ places
-- The rating a visitor sees, kept on the place itself rather than counted from
-- reviews on every read: a list of 20 places would otherwise cost 20 counts,
-- and the API has 10 ms of CPU per request.
--
-- Today it is typed in by hand in the dashboard. When reviews open to the
-- public, the trigger at the bottom of this file takes over and nobody edits
-- these two columns again.
alter table places add column if not exists rating numeric(2,1)
  check (rating is null or (rating >= 0 and rating <= 5));
alter table places add column if not exists rating_count int not null default 0
  check (rating_count >= 0);

-- ----------------------------------------------------------------- reviews
-- Created now, written to later: the shape is easier to agree on while nothing
-- depends on it, and the API can report a place's reviews the day the feature
-- opens without another migration.
create table if not exists reviews (
  id          bigserial primary key,
  place_id    bigint not null references places(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  -- The comment is optional: a star with no words is still a review.
  comment     text,
  -- Who wrote it. Free text until there are accounts; null means anonymous.
  author      text,
  -- Unpublished reviews stay in the table but are invisible and do not count,
  -- so moderation never means deleting what someone wrote.
  is_published boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_place_published_idx
  on reviews (place_id, is_published, created_at desc);

-- Same rule as the rest of the schema: RLS on with no policies, so the anon
-- key reads nothing and every read goes through the API.
alter table reviews enable row level security;

-- ------------------------------------------------- aggregate, for later use
-- Recomputes a place's rating from its published reviews. Deliberately not
-- attached to a trigger yet: while ratings are typed in by hand, a trigger
-- would reset them to null the first time anyone touched the reviews table.
--
-- When reviews go live, create the trigger:
--
--   create trigger reviews_update_place_rating
--     after insert or update or delete on reviews
--     for each row execute function refresh_place_rating();
--
create or replace function refresh_place_rating() returns trigger as $$
declare
  target bigint := coalesce(new.place_id, old.place_id);
begin
  update places p
     set rating = sub.average,
         rating_count = sub.total
    from (
      select round(avg(rating)::numeric, 1) as average, count(*) as total
        from reviews
       where place_id = target and is_published
    ) as sub
   where p.id = target;

  return null;
end;
$$ language plpgsql;
