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

export interface TgMessage {
  message_id: number
  chat: TgChat
  from?: TgUser
  text?: string
  photo?: TgPhotoSize[]
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

interface TgResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

/** Escapes the five characters that matter under `parse_mode: HTML`. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// -------------------------------------------------------------------- client

export class Telegram {
  constructor(private readonly token: string) {}

  private async call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = (await res.json()) as TgResponse<T>
    if (!body.ok) {
      throw new Error(`Telegram ${method} failed (${body.error_code}): ${body.description}`)
    }
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

  sendMessage(chatId: number, text: string, markup?: InlineKeyboardMarkup) {
    return this.call<TgMessage>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    })
  }

  editMessageText(chatId: number, messageId: number, text: string, markup?: InlineKeyboardMarkup) {
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
  sendPhoto(chatId: number, photo: string, caption: string, markup?: InlineKeyboardMarkup) {
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
