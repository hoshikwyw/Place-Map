/**
 * A thin Telegram Bot API client - just the handful of methods this bot uses.
 *
 * No bot framework: grammY and friends carry a middleware stack that would be
 * loaded and executed on every webhook request, and the whole bot is the five
 * calls below.
 */

// ---------------------------------------------------------------- wire types

export interface TgChat {
  id: number
  type: string
}

export interface TgPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
}

export interface TgUser {
  id: number
  /** IETF tag from the client's settings, e.g. `my`, `en-GB`. Often absent. */
  language_code?: string
}

export interface TgLocation {
  latitude: number
  longitude: number
}

export interface TgMessage {
  message_id: number
  chat: TgChat
  from?: TgUser
  text?: string
  photo?: TgPhotoSize[]
  /** Present when the user tapped the location button, or sent a pin. */
  location?: TgLocation
}

export interface TgCallbackQuery {
  id: string
  from?: TgUser
  data?: string
  message?: TgMessage
}

export interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

export interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}

/**
 * The keyboard that replaces the user's own, below the text box. Only this
 * kind can ask for a location - an inline button cannot - and Telegram only
 * honours `request_location` in private chats.
 */
export interface ReplyKeyboardMarkup {
  keyboard: { text: string; request_location?: boolean }[][]
  resize_keyboard?: boolean
  is_persistent?: boolean
  one_time_keyboard?: boolean
}

export interface RemoveKeyboard {
  remove_keyboard: true
}

export type Markup = InlineKeyboardMarkup | ReplyKeyboardMarkup | RemoveKeyboard

interface TgResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

/**
 * Escapes the three characters Telegram's HTML parser reserves.
 *
 * Quotes are deliberately left alone. They only need escaping inside an
 * attribute, and nothing here builds one - every link is a button, not an
 * anchor. Escaping them turned every apostrophe in a reply into a numeric
 * entity, which Telegram shows literally in a message that has no tags around
 * it, so "I'll find cafes near you" reached the user as "I&#39;ll".
 */
export function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

// -------------------------------------------------------------------- client

export const TELEGRAM_API_BASE = 'https://api.telegram.org'

/** Carries Telegram's own code and description, which some callers act on. */
export class TelegramError extends Error {
  constructor(
    readonly method: string,
    readonly code: number | undefined,
    readonly description: string | undefined,
  ) {
    super(`Telegram ${method} failed (${code}): ${description}`)
    this.name = 'TelegramError'
  }
}

export class Telegram {
  /**
   * `base` exists so the whole bot can be run against a stand-in Telegram
   * during development, when there is no bot token to speak to the real one.
   * It defaults to the real API and is never set in production.
   */
  constructor(
    private readonly token: string,
    private readonly base: string = TELEGRAM_API_BASE,
  ) {}

  private async call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.base}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = (await res.json()) as TgResponse<T>
    if (!body.ok) throw new TelegramError(method, body.error_code, body.description)
    return body.result as T
  }

  /**
   * Must be called for every callback query, even with nothing to say, or the
   * button keeps spinning in the client until it times out.
   */
  answerCallbackQuery(id: string, text?: string) {
    return this.call<boolean>('answerCallbackQuery', {
      callback_query_id: id,
      ...(text ? { text } : {}),
    })
  }

  sendMessage(chatId: number, text: string, markup?: Markup) {
    return this.call<TgMessage>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    })
  }

  /**
   * Returns null when Telegram says the message already looks like this.
   *
   * Two taps on the same button send the same callback twice, and the second
   * edit has nothing left to change. Telegram calls that a 400, but for a bot
   * that redraws a screen it means the screen is already right - treating it
   * as a failure put "Something went wrong" in front of the user for pressing
   * a button twice.
   */
  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    markup?: InlineKeyboardMarkup,
  ): Promise<TgMessage | null> {
    try {
      return await this.editMessageTextOrThrow(chatId, messageId, text, markup)
    } catch (error) {
      if (error instanceof TelegramError && error.description?.includes('message is not modified')) {
        return null
      }
      throw error
    }
  }

  private editMessageTextOrThrow(
    chatId: number,
    messageId: number,
    text: string,
    markup?: InlineKeyboardMarkup,
  ) {
    return this.call<TgMessage>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    })
  }

  /** `photo` is either a `file_id` (free) or a URL (costs CDN bandwidth once). */
  sendPhoto(chatId: number, photo: string, caption: string, markup?: Markup) {
    return this.call<TgMessage>('sendPhoto', {
      chat_id: chatId,
      photo,
      caption,
      parse_mode: 'HTML',
      ...(markup ? { reply_markup: markup } : {}),
    })
  }

  deleteMessage(chatId: number, messageId: number) {
    return this.call<boolean>('deleteMessage', { chat_id: chatId, message_id: messageId })
  }
}

/**
 * Telegram returns every rendered size of an uploaded photo. The last entry is
 * the largest, and its `file_id` is the one worth caching.
 */
export function largestFileId(message: TgMessage): string | null {
  const sizes = message.photo
  if (!sizes || sizes.length === 0) return null
  return sizes[sizes.length - 1]?.file_id ?? null
}
