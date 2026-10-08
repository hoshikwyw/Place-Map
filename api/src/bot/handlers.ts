import type { ExecutionContext } from 'hono'
import type { Env } from '../types.js'
import { ASSISTANT_LIMIT_MAX } from '@place-map/shared'
import {
  askAssistant,
  fetchCategories,
  fetchCategoryPlaces,
  fetchPlace,
} from './api-client.js'
import { CAPTION_LIMIT, MESSAGE_LIMIT, formatPlace } from './format.js'
import {
  ALL_CATEGORIES,
  categoriesKeyboard,
  decode,
  locationKeyboard,
  nearbyKeyboard,
  placeKeyboard,
  placesKeyboard,
  searchKeyboard,
  type Action,
  type Point,
} from './keyboards.js'
import { firstPhoto, rememberFileId, type CachedPhoto } from './photo-cache.js'
import { strings } from './strings.js'
import {
  Telegram,
  escapeHtml,
  largestFileId,
  type InlineKeyboardMarkup,
  type TgMessage,
  type TgUpdate,
  type TgUser,
} from './telegram.js'

/** Six fits on a phone screen without the keyboard needing its own scroll. */
const PAGE_SIZE = 6

/**
 * One screen of answers to a typed question. There is no pager: the question
 * would have to travel in `callback_data`, which holds 64 bytes and would
 * truncate anything real.
 */
const ANSWER_LIMIT = 8

/**
 * A shared location is paged, because the point itself fits in a button. This
 * is the most the assistant will return, which is four pages of six.
 */
const NEARBY_LIMIT = ASSISTANT_LIMIT_MAX

interface Bot {
  env: Env
  ctx: ExecutionContext
  tg: Telegram
  lang: string
}

/** Where a callback came from, so a screen can replace it instead of stacking. */
interface Origin {
  messageId: number
  isPhoto: boolean
}

type Screen =
  | { kind: 'text'; text: string; markup?: InlineKeyboardMarkup }
  | { kind: 'photo'; photo: CachedPhoto; caption: string; markup?: InlineKeyboardMarkup }

// -------------------------------------------------------------------- render

/**
 * Navigation replaces the current message rather than appending, so the chat
 * stays one screen deep.
 *
 * Telegram cannot edit a text message into a photo message or back, so those
 * transitions delete and re-send. Paging within a list - by far the most common
 * action - stays a true in-place edit.
 */
async function render(bot: Bot, chatId: number, origin: Origin | null, screen: Screen) {
  const { tg } = bot

  const canEditInPlace = origin !== null && screen.kind === 'text' && !origin.isPhoto

  if (canEditInPlace) {
    await tg.editMessageText(chatId, origin.messageId, screen.text, screen.markup)
    return
  }

  if (origin) {
    // A message older than 48 hours cannot be deleted; sending the new screen
    // still works, so this is never fatal.
    try {
      await tg.deleteMessage(chatId, origin.messageId)
    } catch (error) {
      console.warn('deleteMessage failed', error)
    }
  }

  if (screen.kind === 'text') {
    await tg.sendMessage(chatId, screen.text, screen.markup)
    return
  }

  const { photo, caption, markup } = screen
  const sent = await tg.sendPhoto(chatId, photo.fileId ?? photo.url, caption, markup)

  // First send went out as an ImageKit URL. Telegram has now stored the file,
  // so cache the id and every later send is served from their CDN for free.
  if (!photo.fileId) {
    const fileId = largestFileId(sent)
    if (fileId) bot.ctx.waitUntil(rememberFileId(bot.env, photo.imageId, fileId))
  }
}

// ------------------------------------------------------------------- screens

async function showHome(bot: Bot, chatId: number, origin: Origin | null) {
  const t = strings(bot.lang)
  const categories = await fetchCategories(bot.env, bot.ctx, bot.lang)

  if (categories.length === 0) {
    await render(bot, chatId, origin, { kind: 'text', text: t.noCategories })
    return
  }

  await render(bot, chatId, origin, {
    kind: 'text',
    text: `<b>${escapeHtml(t.categories)}</b>\n${escapeHtml(t.welcome)}`,
    markup: categoriesKeyboard(categories),
  })
}

async function showCategory(
  bot: Bot,
  chatId: number,
  origin: Origin | null,
  categoryId: number,
  page: number,
) {
  const t = strings(bot.lang)

  // callback_data carries the numeric id, but the API is keyed by slug. The
  // category list is cached for an hour, so this costs nothing after the first
  // lookup.
  const categories = await fetchCategories(bot.env, bot.ctx, bot.lang)
  const category = categories.find((entry) => entry.id === categoryId)

  if (!category) {
    await showHome(bot, chatId, origin)
    return
  }

  const { data, meta } = await fetchCategoryPlaces(
    bot.env,
    bot.ctx,
    bot.lang,
    category.slug,
    page,
    PAGE_SIZE,
  )

  const heading = category.icon
    ? `${category.icon} <b>${escapeHtml(category.name)}</b>`
    : `<b>${escapeHtml(category.name)}</b>`

  if (data.length === 0) {
    await render(bot, chatId, origin, {
      kind: 'text',
      text: `${heading}\n${escapeHtml(t.emptyCategory)}`,
      markup: placesKeyboard([], category.id, 1, 1, bot.lang),
    })
    return
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))

  await render(bot, chatId, origin, {
    kind: 'text',
    text: `${heading}\n${meta.total} ${t.places(meta.total)}`,
    markup: placesKeyboard(data, category.id, page, totalPages, bot.lang),
  })
}

/**
 * `back` is where the "Back" button goes, because a place can be reached from
 * a category page, a search answer or a nearby list, and a callback query says
 * nothing about which.
 */
async function showPlace(
  bot: Bot,
  chatId: number,
  origin: Origin | null,
  placeId: number,
  back: Action,
) {
  const t = strings(bot.lang)

  let place
  try {
    place = await fetchPlace(bot.env, bot.ctx, bot.lang, placeId)
  } catch {
    await render(bot, chatId, origin, { kind: 'text', text: t.notFound })
    return
  }

  const markup = placeKeyboard(place, back, bot.lang)
  const photo = await firstPhoto(bot.env, placeId)

  if (!photo) {
    await render(bot, chatId, origin, {
      kind: 'text',
      text: formatPlace(place, bot.lang, MESSAGE_LIMIT),
      markup,
    })
    return
  }

  await render(bot, chatId, origin, {
    kind: 'photo',
    photo,
    caption: formatPlace(place, bot.lang, CAPTION_LIMIT),
    markup,
  })
}

/**
 * A typed question, answered by the keyword assistant - the same one behind
 * the website's chat panel, so "cafe near me", "open now" and Myanmar
 * phrasings all mean here what they mean there.
 *
 * No pager: the question would have to travel in `callback_data`, which holds
 * 64 bytes and would truncate anything real. One screen of answers plus a
 * nudge to narrow the question is the honest trade.
 */
async function showAnswer(bot: Bot, chatId: number, message: TgMessage, query: string) {
  const t = strings(bot.lang)

  if (query.length < 2) {
    await bot.tg.sendMessage(chatId, escapeHtml(t.queryTooShort))
    return
  }

  const result = await askAssistant(bot.env, bot.ctx, bot.lang, query, null, ANSWER_LIMIT)

  // "near me" with no location. The assistant says so in the right language;
  // the bot's job is to put the location button in reach.
  if (result.needs_location) {
    await bot.tg.sendMessage(
      chatId,
      `${escapeHtml(result.reply)}
${escapeHtml(t.locationKept)}`,
      locationRequest(bot, message),
    )
    return
  }

  if (result.places.length === 0) {
    await bot.tg.sendMessage(chatId, escapeHtml(result.reply))
    return
  }

  await bot.tg.sendMessage(
    chatId,
    escapeHtml(result.reply),
    searchKeyboard(result.places, bot.lang),
  )
}

/**
 * What is nearest to a point the user shared, optionally narrowed to one
 * category. The point travels in the keyboard rather than in any store, so
 * the bot never holds anybody's whereabouts - see the note in keyboards.ts.
 */
async function showNearby(
  bot: Bot,
  chatId: number,
  origin: Origin | null,
  categoryId: number,
  at: Point,
  page: number,
) {
  const t = strings(bot.lang)
  const categories = await fetchCategories(bot.env, bot.ctx, bot.lang)
  const category = categories.find((entry) => entry.id === categoryId) ?? null

  // The assistant is asked the question the user did not type. Its category
  // words come from the categories themselves, so the name is enough.
  const query = category ? `${category.name} ${t.nearPhrase}` : t.nearPhrase
  const result = await askAssistant(bot.env, bot.ctx, bot.lang, query, at, NEARBY_LIMIT)

  const heading = category
    ? `${category.icon ? category.icon + ' ' : ''}<b>${escapeHtml(category.name)}</b> · ${escapeHtml(t.nearYou)}`
    : `<b>${escapeHtml(t.nearYou)}</b>`

  if (result.places.length === 0) {
    await render(bot, chatId, origin, {
      kind: 'text',
      text: `${heading}
${escapeHtml(t.nearYouEmpty)}`,
      markup: nearbyKeyboard([], categories, categoryId, at, 1, 1, bot.lang),
    })
    return
  }

  const totalPages = Math.max(1, Math.ceil(result.places.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const slice = result.places.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  await render(bot, chatId, origin, {
    kind: 'text',
    text: `${heading}
${escapeHtml(t.nearest(result.places.length))}`,
    markup: nearbyKeyboard(slice, categories, categoryId, at, safePage, totalPages, bot.lang),
  })
}

/**
 * Telegram only honours `request_location` on a reply keyboard in a private
 * chat. In a group the button would simply never appear, so there the bot
 * says what to do instead of showing one that cannot work.
 */
function locationRequest(bot: Bot, message: TgMessage) {
  return message.chat.type === 'private' ? locationKeyboard(bot.lang) : undefined
}

// ------------------------------------------------------------------ dispatch

/** Telegram reports the client's language; honour it if the API supports it. */
function resolveLang(env: Env, user: TgUser | undefined): string {
  const supported = env.SUPPORTED_LANGS.split(',').map((s) => s.trim().toLowerCase())
  const tag = user?.language_code?.toLowerCase().split('-')[0]
  return tag && supported.includes(tag) ? tag : env.DEFAULT_LANG.toLowerCase()
}

/**
 * Whatever goes wrong inside a screen, the user gets a sentence rather than a
 * chat that stopped responding. Logged where an operator can see the cause.
 */
async function guard(bot: Bot, chatId: number, what: string, run: () => Promise<void>) {
  try {
    await run()
  } catch (error) {
    console.error(`${what} failed`, error)
    await bot.tg.sendMessage(chatId, escapeHtml(strings(bot.lang).error))
  }
}

async function handleCallback(bot: Bot, query: NonNullable<TgUpdate['callback_query']>) {
  // Answered first and unconditionally - until this lands, the button spins
  // in the client, and a slow database lookup would look like a hung bot.
  try {
    await bot.tg.answerCallbackQuery(query.id)
  } catch (error) {
    console.warn('answerCallbackQuery failed', error)
  }

  const action = decode(query.data)
  const message = query.message
  if (!action || action.type === 'nop' || !message) return

  const chatId = message.chat.id
  const origin: Origin = {
    messageId: message.message_id,
    isPhoto: Array.isArray(message.photo) && message.photo.length > 0,
  }

  await guard(bot, chatId, 'callback handler', async () => {
    switch (action.type) {
      case 'home':
        return showHome(bot, chatId, origin)
      case 'category':
        return showCategory(bot, chatId, origin, action.id, action.page)
      case 'place':
        return showPlace(bot, chatId, origin, action.id, {
          type: 'category',
          id: action.categoryId,
          page: action.page,
        })
      case 'nearby':
        return showNearby(bot, chatId, origin, action.categoryId, action.at, action.page)
      case 'nearPlace':
        return showPlace(bot, chatId, origin, action.id, {
          type: 'nearby',
          categoryId: action.categoryId,
          at: action.at,
          page: action.page,
        })
    }
  })
}

async function handleMessage(bot: Bot, message: TgMessage) {
  const chatId = message.chat.id
  const t = strings(bot.lang)

  await guard(bot, chatId, 'message handler', async () => {
    // A shared location, or any pin the user forwarded: answer with what is
    // nearest to it. Sent as a new message rather than an edit - the location
    // the user sent stays in the chat above it, as they expect.
    if (message.location) {
      const at = { lat: message.location.latitude, lng: message.location.longitude }
      return showNearby(bot, chatId, null, ALL_CATEGORIES, at, 1)
    }

    if (!message.text) return
    const text = message.text.trim()

    if (text.startsWith('/start') || text.startsWith('/help')) {
      // The location button comes with the welcome, so sharing a location is
      // one tap away from the first screen rather than a command nobody reads.
      const keyboard = locationRequest(bot, message)
      if (keyboard) await bot.tg.sendMessage(chatId, escapeHtml(t.askLocation), keyboard)
      return showHome(bot, chatId, null)
    }

    if (text.startsWith('/nearby') || text.startsWith('/near')) {
      const keyboard = locationRequest(bot, message)
      await bot.tg.sendMessage(
        chatId,
        escapeHtml(keyboard ? t.askLocation : t.locationOnlyInPrivate),
        keyboard,
      )
      return
    }

    if (text.startsWith('/')) return // unknown command: stay quiet
    return showAnswer(bot, chatId, message, text)
  })
}

export async function handleUpdate(env: Env, ctx: ExecutionContext, update: TgUpdate) {
  const tg = new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_API_BASE)
  const from = update.callback_query?.from ?? update.message?.from
  const bot: Bot = { env, ctx, tg, lang: resolveLang(env, from) }

  if (update.callback_query) return handleCallback(bot, update.callback_query)
  if (update.message) return handleMessage(bot, update.message)
}
