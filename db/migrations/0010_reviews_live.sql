-- Place Map - reviews open to the public
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- 0004 built the reviews table and the aggregate function and deliberately
-- stopped there: while ratings were typed in by hand, a trigger would have
-- reset them the first time anyone touched the table. This is the migration
-- that migration was waiting for.
--
-- Two changes, and the second is the one to read twice.

-- ------------------------------------------------------- held for approval
-- 0004 published on arrival. A review is meant to be read by strangers under
-- somebody else's name, and there are no accounts behind any of it, so nothing
-- is visible until an editor says so.
--
-- The default does the work rather than the API always passing false. A route
-- that forgets is then a review nobody sees, which is a dull bug; the other
-- way round it is abuse on your site until you notice.
alter table reviews alter column is_published set default false;

-- Everything already in the table was written by hand in the dashboard, so it
-- stays visible. There is nothing to hold back - this is only here to say the
-- question was asked.
--   update reviews set is_published = true where created_at < now();

-- The dashboard opens on what is waiting. The index from 0004 leads with
-- place_id, which does not help a query filtered only by is_published.
create index if not exists reviews_pending_idx
  on reviews (is_published, created_at desc);

-- ---------------------------------------------------------------- the trigger
-- From here, places.rating and places.rating_count are computed, not typed.
-- The function was written in 0004 and counts published reviews only, so an
-- unapproved review moves nothing; approving one is what changes a rating.
--
-- Worth knowing before you run this: a place with a rating you typed by hand
-- keeps it until its first review is approved, and is then replaced by the
-- average of its approved reviews. A place whose only approved review is three
-- stars shows 3.0, whatever you had typed before.
drop trigger if exists reviews_update_place_rating on reviews;

create trigger reviews_update_place_rating
  after insert or update or delete on reviews
  for each row execute function refresh_place_rating();

comment on table reviews is
  'Visitor reviews. Nothing is visible until is_published is set by an editor; the trigger recomputes places.rating from the published ones.';
