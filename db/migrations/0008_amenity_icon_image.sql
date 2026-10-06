-- Place Map - an uploaded icon for an amenity
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- The same column categories gained in 0003, for the same reason: an emoji
-- renders differently on every platform and there is no emoji at all for most
-- things a place might offer. A path, not a URL - the API prefixes it with
-- IMAGEKIT_URL_ENDPOINT on the way out, so moving CDN is a config change
-- rather than an update of every row.
--
-- The emoji stays beside it. It is what shows while an image is loading or
-- missing, and it is all a Telegram button label can hold.

alter table amenities add column if not exists icon_image text;

comment on column amenities.icon_image is 'Storage path of an uploaded icon, e.g. /amenities/wifi-123.webp. Null to fall back to the emoji.';
