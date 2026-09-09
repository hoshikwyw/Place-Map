-- Place Map - seed data
-- Locales used here are "en" and "uz". Change them everywhere if yours differ;
-- DEFAULT_LANG in api/src/lib/lang.ts must match one of them.

insert into categories (slug, name, icon, sort_order) values
  ('cafes',       '{"en":"Cafes","uz":"Kafelar"}',                 '☕', 10),
  ('restaurants', '{"en":"Restaurants","uz":"Restoranlar"}',       '🍽', 20),
  ('parks',       '{"en":"Parks","uz":"Bog''lar"}',                '🌳', 30),
  ('museums',     '{"en":"Museums","uz":"Muzeylar"}',              '🏛', 40),
  ('shopping',    '{"en":"Shopping","uz":"Savdo markazlari"}',     '🛍', 50)
on conflict (slug) do nothing;

insert into places
  (category_id, slug, name, description, address, lat, lng, phone, website, opening_hours, sort_order)
values
  (
    (select id from categories where slug = 'cafes'),
    'cafe-central',
    '{"en":"Cafe Central","uz":"Kafe Central"}',
    '{"en":"Small specialty coffee bar with outdoor seating.","uz":"Ochiq havoda o''tirish joyi bor kichik qahvaxona."}',
    '12 Main St',
    41.3111, 69.2797,
    '+998901234567',
    'https://example.com',
    '{"mon":[["09:00","18:00"]],"tue":[["09:00","18:00"]],"wed":[["09:00","18:00"]],"thu":[["09:00","18:00"]],"fri":[["09:00","18:00"]],"sat":[["10:00","14:00"],["16:00","22:00"]],"sun":[]}',
    10
  ),
  (
    (select id from categories where slug = 'restaurants'),
    'plov-house',
    '{"en":"Plov House","uz":"Osh markazi"}',
    '{"en":"Traditional plov, served until it runs out.","uz":"An''anaviy osh, tugaguncha beriladi."}',
    '5 Amir Temur Ave',
    41.3155, 69.2790,
    '+998901112233',
    null,
    '{"mon":[["11:00","16:00"]],"tue":[["11:00","16:00"]],"wed":[["11:00","16:00"]],"thu":[["11:00","16:00"]],"fri":[["11:00","16:00"]],"sat":[["11:00","16:00"]],"sun":[["11:00","15:00"]]}',
    10
  ),
  (
    (select id from categories where slug = 'parks'),
    'city-park',
    '{"en":"City Park","uz":"Shahar bog''i"}',
    '{"en":"Central park with fountains and a small lake.","uz":"Favvoralar va kichik ko''li bor markaziy bog''."}',
    'Navoi St',
    41.3200, 69.2600,
    null, null,
    '{"mon":[["06:00","23:00"]],"tue":[["06:00","23:00"]],"wed":[["06:00","23:00"]],"thu":[["06:00","23:00"]],"fri":[["06:00","23:00"]],"sat":[["06:00","23:00"]],"sun":[["06:00","23:00"]]}',
    10
  )
on conflict (slug) do nothing;
