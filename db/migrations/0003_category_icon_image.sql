-- Place Map - optional image icons for categories
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- The emoji in `icon` stays and is still the fallback: the Telegram bot puts it
-- into button labels and message headings, where an image cannot go. This holds
-- the ImageKit path of an uploaded icon - the same kind of value as
-- place_images.storage_path - and the website and app prefer it when set.

alter table categories add column if not exists icon_image text;
