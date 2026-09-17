-- Place Map - seed data
-- Locales used here are "en" and "my" (Myanmar). SUPPORTED_LANGS in
-- api/wrangler.toml must list the same locales.
-- Sample places only - replace them with real ones through the admin dashboard.

insert into categories (slug, name, icon, sort_order) values
  ('cafes',       '{"en":"Cafes","my":"ကော်ဖီဆိုင်များ"}',            '☕', 10),
  ('restaurants', '{"en":"Restaurants","my":"စားသောက်ဆိုင်များ"}',    '🍽', 20),
  ('parks',       '{"en":"Parks","my":"ပန်းခြံများ"}',                '🌳', 30),
  ('museums',     '{"en":"Museums","my":"ပြတိုက်များ"}',              '🏛', 40),
  ('shopping',    '{"en":"Shopping","my":"ဈေးဝယ်စင်တာများ"}',         '🛍', 50)
on conflict (slug) do nothing;

insert into places
  (category_id, slug, name, description, address, lat, lng, phone, website, opening_hours, sort_order)
values
  (
    (select id from categories where slug = 'cafes'),
    'cafe-central',
    '{"en":"Cafe Central","my":"ကဖေး စင်ထရယ်"}',
    '{"en":"Small specialty coffee bar with outdoor seating.","my":"အပြင်ဘက်တွင် ထိုင်ခုံများပါရှိသော သေးငယ်သည့် ကော်ဖီဆိုင်။"}',
    '12 Pansodan St, Yangon',
    16.7750, 96.1605,
    '+959123456789',
    'https://example.com',
    '{"mon":[["09:00","18:00"]],"tue":[["09:00","18:00"]],"wed":[["09:00","18:00"]],"thu":[["09:00","18:00"]],"fri":[["09:00","18:00"]],"sat":[["10:00","14:00"],["16:00","22:00"]],"sun":[]}',
    10
  ),
  (
    (select id from categories where slug = 'restaurants'),
    'noodle-house',
    '{"en":"Noodle House","my":"ခေါက်ဆွဲဆိုင်"}',
    '{"en":"Mohinga and noodle dishes, served every morning.","my":"မုန့်ဟင်းခါးနှင့် ခေါက်ဆွဲဟင်းလျာများ၊ နံနက်တိုင်း ရောင်းသည်။"}',
    '5 Anawrahta Rd, Yangon',
    16.7785, 96.1540,
    '+959987654321',
    null,
    '{"mon":[["06:00","11:00"]],"tue":[["06:00","11:00"]],"wed":[["06:00","11:00"]],"thu":[["06:00","11:00"]],"fri":[["06:00","11:00"]],"sat":[["06:00","11:00"]],"sun":[["06:00","11:00"]]}',
    10
  ),
  (
    (select id from categories where slug = 'parks'),
    'city-park',
    '{"en":"City Park","my":"မြို့တော် ပန်းခြံ"}',
    '{"en":"Green park with a lake and walking paths.","my":"ရေကန်နှင့် လမ်းလျှောက်လမ်းများပါရှိသော စိမ်းလန်းသည့် ပန်းခြံ။"}',
    'Kan Yeik Thar Rd, Yangon',
    16.7900, 96.1600,
    null, null,
    '{"mon":[["05:00","21:00"]],"tue":[["05:00","21:00"]],"wed":[["05:00","21:00"]],"thu":[["05:00","21:00"]],"fri":[["05:00","21:00"]],"sat":[["05:00","21:00"]],"sun":[["05:00","21:00"]]}',
    10
  )
on conflict (slug) do nothing;
