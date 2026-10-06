-- Place Map - more than one link per place
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- A place usually has a Facebook page, often an Instagram or TikTok, sometimes
-- a Telegram channel, and only occasionally a website of its own. One `website`
-- column could hold just the last of those.
--
-- Stored as jsonb - an ordered array of {"type": "facebook", "url": "https://..."}
-- - rather than a table of its own: links are only ever read with their place,
-- and a join per place would cost the Worker a query it does not have the CPU
-- budget for. The same reasoning as opening_hours.
--
-- `website` stays as it is. It is the canonical site, the Telegram bot puts it
-- in a message button, and moving it would break that for no gain.

alter table places add column if not exists links jsonb not null default '[]'::jsonb;

-- Guard the shape here too, not only in the API: a bad row written by hand in
-- the SQL editor would otherwise reach every client.
alter table places drop constraint if exists places_links_is_array;
alter table places add constraint places_links_is_array
  check (jsonb_typeof(links) = 'array');
