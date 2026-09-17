/**
 * The assistant's one-sentence answers. Written here rather than in each client
 * so the website and the app always say the same thing.
 */

export type ReplyKind =
  | 'help' // nothing in the message was recognised
  | 'needs_location' // "near me" without a location
  | 'found'
  | 'none'

export interface ReplyInput {
  kind: ReplyKind
  /** Localised category name, when one was recognised. */
  category: string | null
  keywords: string[]
  openNow: boolean
  nearMe: boolean
  /** Results are sorted by distance. */
  sortedByDistance: boolean
  radiusKm: number
  /** Nothing was inside the radius, so the search was widened to this. */
  widenedToKm: number | null
  /** The keywords matched nothing and were ignored. */
  droppedKeywords: string[]
}

const km = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))
const quoted = (words: string[]) => `"${words.join(' ')}"`

function english(input: ReplyInput): string {
  if (input.kind === 'help') {
    return 'Tell me what you are looking for, like "cafe near me" or "restaurants open now".'
  }

  const subject = input.category
    ? input.category.toLowerCase()
    : input.keywords.length
      ? `places matching ${quoted(input.keywords)}`
      : 'places'
  const what = input.openNow ? `${subject} open now` : subject

  if (input.kind === 'needs_location') return `Share your location and I'll find ${what} near you.`

  if (input.kind === 'none') {
    return input.nearMe
      ? `Sorry, there are no ${what} within ${km(input.widenedToKm ?? input.radiusKm)} km of you.`
      : `Sorry, I couldn't find any ${what}.`
  }

  const dropped = input.droppedKeywords.length ? `Nothing matched ${quoted(input.droppedKeywords)}. ` : ''
  if (input.widenedToKm !== null) {
    return `${dropped}Nothing within ${km(input.radiusKm)} km, so here are the closest ${what}.`
  }
  if (input.nearMe) return `${dropped}Here are ${what} near you, nearest first.`
  if (input.sortedByDistance) return `${dropped}Here are ${what}, nearest first.`
  return `${dropped}Here are ${what}.`
}

function myanmar(input: ReplyInput): string {
  if (input.kind === 'help') {
    return 'ဘာရှာချင်လဲ ပြောပြပါ။ ဥပမာ - "အနီးက ကော်ဖီဆိုင်" သို့မဟုတ် "အခုဖွင့်ထားတဲ့ စားသောက်ဆိုင်"။'
  }

  const subject = input.category
    ? input.category
    : input.keywords.length
      ? `${quoted(input.keywords)} နှင့် ကိုက်ညီသည့် နေရာများ`
      : 'နေရာများ'
  const what = input.openNow ? `အခုဖွင့်ထားသော ${subject}` : subject

  if (input.kind === 'needs_location') return `သင့်အနီးရှိ ${what} ကို ရှာရန် တည်နေရာကို မျှဝေပေးပါ။`

  if (input.kind === 'none') {
    return input.nearMe
      ? `သင့်အနီး ${km(input.widenedToKm ?? input.radiusKm)} ကီလိုမီတာအတွင်း ${what} မရှိပါ။`
      : `${what} ကို ရှာမတွေ့ပါ။`
  }

  const dropped = input.droppedKeywords.length ? `${quoted(input.droppedKeywords)} ကို ရှာမတွေ့ပါ။ ` : ''
  if (input.widenedToKm !== null) {
    return `${dropped}${km(input.radiusKm)} ကီလိုမီတာအတွင်း မတွေ့ပါ။ အနီးဆုံး ${what} ကို ပြထားပါတယ်။`
  }
  if (input.nearMe) return `${dropped}သင့်အနီးရှိ ${what} ဖြစ်ပါတယ်။ အနီးဆုံးမှ စီထားပါတယ်။`
  if (input.sortedByDistance) return `${dropped}${what} ဖြစ်ပါတယ်။ အနီးဆုံးမှ စီထားပါတယ်။`
  return `${dropped}${what} ဖြစ်ပါတယ်။`
}

export function reply(lang: string, input: ReplyInput): string {
  return lang === 'my' ? myanmar(input) : english(input)
}
