/**
 * Everything the assistant recognises, in English and Myanmar (Unicode - Zawgyi
 * input is converted before matching). Add words here; nothing else changes.
 *
 * Myanmar is written without spaces between words, so Myanmar entries match as
 * substrings. Keep them specific enough that they cannot turn up inside an
 * unrelated word.
 */

/**
 * Words that mean the same kind of place. Categories are created in the admin
 * dashboard, so none are hard-coded: when a category's own name or slug
 * matches a word in a group, the whole group becomes words for that category.
 * A group with no matching category does nothing.
 */
export const SYNONYM_GROUPS: string[][] = [
  ['cafe', 'café', 'coffee', 'coffee shop', 'coffeeshop', 'ကော်ဖီ', 'ကော်ဖီဆိုင်', 'ကဖေး'],
  ['tea shop', 'teashop', 'tea house', 'teahouse', 'tea', 'လက်ဖက်ရည်', 'လက်ဖက်ရည်ဆိုင်'],
  [
    'restaurant', 'food', 'eat', 'eating', 'dining', 'dinner', 'lunch', 'breakfast', 'meal',
    'စားသောက်ဆိုင်', 'စားသောက်', 'ထမင်းဆိုင်', 'ထမင်း', 'စားစရာ', 'အစားအစာ',
  ],
  ['park', 'garden', 'playground', 'ပန်းခြံ', 'ဥယျာဉ်'],
  ['museum', 'gallery', 'exhibition', 'ပြတိုက်', 'ပြခန်း'],
  ['shopping', 'shop', 'mall', 'market', 'store', 'ဈေးဝယ်စင်တာ', 'ဈေးဝယ်', 'ဈေး', 'ကုန်တိုက်'],
  ['bar', 'pub', 'beer', 'ဘီယာဆိုင်', 'ဘီယာ', 'ဘား'],
  ['hotel', 'guesthouse', 'guest house', 'hostel', 'ဟိုတယ်', 'တည်းခိုခန်း'],
  ['bakery', 'bread', 'cake', 'ပေါင်မုန့်', 'ကိတ်မုန့်', 'မုန့်ဆိုင်'],
  ['pharmacy', 'drugstore', 'ဆေးဆိုင်'],
  ['hospital', 'clinic', 'ဆေးရုံ', 'ဆေးခန်း'],
  ['bank', 'atm', 'ဘဏ်'],
  ['gas station', 'petrol', 'fuel', 'ဓာတ်ဆီဆိုင်', 'ဓာတ်ဆီ'],
  ['pagoda', 'temple', 'monastery', 'ဘုရား', 'စေတီ', 'ဘုန်းကြီးကျောင်း'],
  ['gym', 'fitness', 'အားကစားရုံ'],
  ['supermarket', 'grocery', 'စူပါမားကတ်'],
]

/** "Find it near where I am." */
export const NEAR_WORDS = [
  'near me', 'nearby', 'near by', 'nearest', 'closest', 'close to me', 'close by', 'around me',
  'around here', 'near here', 'my location', 'my area', 'near',
  'အနီးအနား', 'အနီးဆုံး', 'ဒီအနီး', 'အနီး', 'နီးနီး', 'နီးတဲ့', 'နီးသော', 'အနားမှာ', 'အနား',
  'ဒီနားမှာ', 'ဒီနား', 'တည်နေရာ', 'နီး',
]

/** "Only places open at this moment." */
export const OPEN_WORDS = [
  'open right now', 'open now', 'opened now', 'currently open', 'still open', 'opening now', 'open',
  'ဖွင့်ထားတဲ့', 'ဖွင့်ထားသော', 'ဖွင့်နေတဲ့', 'ဖွင့်နေသော', 'ဖွင့်ထား', 'ဖွင့်',
]

/** "Within 2 km", "500 m", "၂ ကီလိုမီတာ". Digits are ASCII by the time this runs. */
export const DISTANCE_PATTERNS: { pattern: RegExp; toKm: (value: number) => number }[] = [
  { pattern: /(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers?|kilometres?|ကီလိုမီတာ|ကီလို)(?![a-z])/, toKm: (v) => v },
  { pattern: /(\d+)\s*(?:m|meters?|metres?|မီတာ)(?![a-z])/, toKm: (v) => v / 1000 },
]

/** English filler. Whatever is left after these becomes a search keyword. */
export const STOP_WORDS = new Set(
  (
    'a an the find search show list give get me i im my we us you your please pls plz want need ' +
    'looking look for some any where wheres what whats which is are there can could would will ' +
    'to go in at on of with and or that one ones place places spot spots good best nice great ' +
    'around here now today tonight right currently recommend suggest hi hello hey thanks thank ' +
    'within km kms meters metres from this'
  ).split(' '),
)

/**
 * Myanmar filler, removed as substrings - longest first, so "ရှာပေးပါ" goes
 * before "ပေး". Leftover fragments shorter than a real word are dropped later.
 */
export const MYANMAR_STOP_PHRASES = [
  'ကျေးဇူးပြု၍', 'ကျေးဇူးပြုပြီး', 'ကျေးဇူးတင်ပါတယ်', 'မင်္ဂလာပါ', 'ဟယ်လို',
  'ရှာပေးပါဦး', 'ရှာပေးပါ', 'ရှာပေး', 'ရှာချင်တယ်', 'ရှာချင်', 'ရှာနေတယ်', 'ရှာ',
  'ပြပေးပါ', 'ပြပေး', 'ပြပါ', 'ပေးပါ', 'ပေး', 'ပါဦး',
  'ကျွန်တော့်', 'ကျွန်တော်', 'ကျွန်မ', 'ကျနော့်', 'ကျနော်', 'ငါ့', 'သင့်',
  'ဘယ်မှာရှိလဲ', 'ဘယ်မှာလဲ', 'ဘယ်မှာ', 'ဘယ်နားမှာ', 'ဘယ်နား',
  'ရှိလား', 'ရှိလဲ', 'ရှိတဲ့', 'ရှိသော',
  'သွားချင်တယ်', 'သွားချင်', 'ချင်တယ်', 'ကောင်းတဲ့', 'လောလောဆယ်', 'အခု',
  'နေရာများ', 'နေရာ', 'ဆိုင်များ', 'ဆိုင်', 'များ', 'တစ်ခုခု',
]
