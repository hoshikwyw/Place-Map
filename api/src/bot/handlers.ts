import type { ExecutionContext } from 'hono'
import type { Env } from '../types.js'
import {
  fetchCategories,
  fetchCategoryPlaces,
  fetchPlace,
  searchPlaces,
} from './api-client.js'
import { CAPTION_LIMIT, MESSAGE_LIMIT, formatPlace } from './format.js'
import {
  categoriesKeyboard,
  decode,
  placeKeyboard,
  placesKeyboard,
  searchKeyboard,
} from './keyboards.js'
import { firstPhoto, rememberFileId, type CachedPhoto } from './photo-cache.js'
import { strings } from './strings.js'
import {
  Telegram,
  escapeHtml,
  largestFileId,
  type InlineKeyboardMarkup,
  type TgUpdate,
  type TgUser,
} from './telegram.js'

/** Six fits on a phone screen without the keyboard needing its own scroll. */
const PAGE_SIZE = 6
const SEARCH_LIMIT = 6

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
      markup: placesKeyboard([], category.id, 1, 1),
    })
    return
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))

  await render(bot, chatId, origin, {
    kind: 'text',
    text: `${heading}\n${meta.total} ${meta.total === 1 ? 'place' : 'places'}`,
    markup: placesKeyboard(data, category.id, page, totalPages),
  })
}

async function showPlace(
  bot: Bot,
  chatId: number,
  origin: Origin | null,
  placeId: number,
  categoryId: number,
  page: number,
) {
  const t = strings(bot.lang)

  let place
  try {
    place = await fetchPlace(bot.env, bot.ctx, bot.lang, placeId)
  } catch {
    await render(bot, chatId, origin, { kind: 'text', text: t.notFound })
    return
  }

  const markup = placeKeyboard(place, categoryId, page)
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
 * Free-text search. No pager: the query would have to travel in
 * `callback_data`, which holds 64 bytes and would truncate anything real. One
 * page of results plus a nudge to narrow the search is the honest trade.
 */
async function showSearch(bot: Bot, chatId: number, query: string) {
  const t = strings(bot.lang)

  if (query.length < 2) {
    await bot.tg.sendMessage(chatId, escapeHtml(t.queryTooShort))
    return
  }

  const { data, meta } = await searchPlaces(bot.env, bot.ctx, bot.lang, query, SEARCH_LIMIT)

  if (data.length === 0) {
    await bot.tg.sendMessage(chatId, escapeHtml(t.noResults(query)))
    return
  }

  const footer =
    meta.total > data.length ? `\n${escapeHtml(t.moreResults(data.length, meta.total))}` : ''

  await bot.tg.sendMessage(
    chatId,
    `<b>${escapeHtml(query)}</b>${footer}`,
    searchKeyboard(data),
  )
}

// ------------------------------------------------------------------ dispatch

/** Telegram reports the client's language; honour it if the API supports it. */
function resolveLang(env: Env, user: TgUser | undefined): string {
  const supported = env.SUPPORTED_LANGS.split(',').map((s) => s.trim().toLowerCase())
  const tag = user?.language_code?.toLowerCase().split('-')[0]
  return tag && supported.includes(tag) ? tag : env.DEFAULT_LANG.toLowerCase()
}

export async function handleUpdate(env: Env, ctx: ExecutionContext, update: TgUpdate) {
  const tg = new Telegram(env.TELEGRAM_BOT_TOKEN)

  if (update.callback_query) {
    const query = update.callback_query
    const bot: Bot = { env, ctx, tg, lang: resolveLang(env, query.from) }

    // Answered first and unconditionally - until this lands, the button spins
    // in the client, and a slow database lookup would look like a hung bot.
    try {
      await tg.answerCallbackQuery(query.id)
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

    try {
      switch (action.type) {
        case 'home':
          await showHome(bot, chatId, origin)
          break
        case 'category':
          await showCategory(bot, chatId, origin, action.id, action.page)
          break
        case 'place':
          await showPlace(bot, chatId, origin, action.id, action.categoryId, action.page)
          break
      }
    } catch (error) {
      console.error('callback handler failed', error)
      await tg.sendMessage(chatId, escapeHtml(strings(bot.lang).error))
    }
    return
  }

  const message = update.message
  if (!message?.text) return

  const bot: Bot = { env, ctx, tg, lang: resolveLang(env, message.from) }
  const chatId = message.chat.id
  const text = message.text.trim()

  try {
    if (text.startsWith('/start') || text.startsWith('/help')) {
      await showHome(bot, chatId, null)
      return
    }
    if (text.startsWith('/')) return // unknown command: stay quiet
    await showSearch(bot, chatId, text)
  } catch (error) {
    console.error('message handler failed', error)
    await tg.sendMessage(chatId, escapeHtml(strings(bot.lang).error))
  }
}
