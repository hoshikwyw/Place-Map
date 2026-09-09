import { Hono } from 'hono'
import { handleUpdate } from './handlers.js'
import type { TgUpdate } from './telegram.js'
import type { AppBindings } from '../types.js'

export const webhook = new Hono<AppBindings>()

/**
 * POST /webhook/telegram
 *
 * Webhook rather than polling: polling needs a process that stays alive, which
 * a Worker is not, and every free host that can do it sleeps.
 */
webhook.post('/telegram', async (c) => {
  // The URL is effectively public. This header is the only thing separating a
  // real update from anyone who guesses the path, so it is checked before the
  // body is even read.
  const secret = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (!secret || secret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: { code: 'not_found', message: 'Not found' } }, 401)
  }

  let update: TgUpdate
  try {
    update = await c.req.json<TgUpdate>()
  } catch {
    // Malformed body: still 200, or Telegram redelivers it forever.
    return c.text('ok')
  }

  // Handled after the response. Telegram retries any non-200 and counts the
  // retry against the 100K/day request budget, so the answer goes out first and
  // the work happens in the background - which also keeps the reply well inside
  // Telegram's timeout when a place has a cold image to upload.
  c.executionCtx.waitUntil(
    handleUpdate(c.env, c.executionCtx, update).catch((error: unknown) => {
      console.error('update handler failed', { update_id: update.update_id, error })
    }),
  )

  return c.text('ok')
})
