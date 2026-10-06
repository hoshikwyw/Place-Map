-- Place Map - amenities become data, not code
-- Run in Supabase Studio -> SQL Editor, or via psql $DATABASE_URL -f this file.
--
-- 0006 introduced amenities as a fixed list compiled into the clients. Adding
-- one meant a deploy, and its label existed only in whatever languages someone
-- had hard-coded. This makes them rows, managed in the dashboard exactly like
-- categories: a slug, a name per language, an emoji and a sort order.
--
-- `places.amenities` is left exactly as it is - a jsonb array of slugs. A join
-- table would be more normal, but PostgREST has no transaction across two
-- writes, so saving a place would stop being atomic: the row could save and
-- its amenity links fail. Slugs in the row keep a save one statement, keep
-- place reads free of another join, and cost only that a slug can outlive the
-- amenity it names - which clients already handle by rendering what they can
-- resolve and ignoring the rest.

create table if not exists amenities (
  id          bigserial primary key,
  slug        text not null unique,    -- lowercase with underscores: outdoor_seating
  name        jsonb not null,          -- {"en": "Wi-Fi", "my": "ဝိုင်ဖိုင်"}
  icon        text,                    -- emoji, shown where no drawn icon exists
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- The nine that were compiled in, with the names and order they already had,
-- so every place that references them keeps rendering through the change.
insert into amenities (slug, name, icon, sort_order) values
  ('wifi',                  '{"en":"Wi-Fi","my":"ဝိုင်ဖိုင်"}',                                    '📶', 10),
  ('parking',               '{"en":"Parking","my":"ကားရပ်နားရန်"}',                                '🅿️', 20),
  ('outdoor_seating',       '{"en":"Outdoor seating","my":"အပြင်ထိုင်ခုံ"}',                        '🌤', 30),
  ('air_conditioning',      '{"en":"Air conditioning","my":"အဲယားကွန်း"}',                          '❄️', 40),
  ('delivery',              '{"en":"Delivery","my":"အိမ်အရောက်ပို့"}',                              '🛵', 50),
  ('takeaway',              '{"en":"Takeaway","my":"ထုပ်ယူ"}',                                      '🥡', 60),
  ('card_payment',          '{"en":"Card accepted","my":"ကတ်ဖြင့် ပေးချေနိုင်"}',                   '💳', 70),
  ('family_friendly',       '{"en":"Family friendly","my":"မိသားစုနှင့် သင့်တော်"}',                '👪', 80),
  ('wheelchair_accessible', '{"en":"Wheelchair accessible","my":"ဘီးတပ်ကုလားထိုင် သွားလာနိုင်"}',  '♿', 90)
on conflict (slug) do nothing;

comment on table amenities is 'Catalog of amenity labels. places.amenities holds slugs from here.';
comment on column amenities.slug is 'Referenced by places.amenities; renaming one orphans every place that used it.';
