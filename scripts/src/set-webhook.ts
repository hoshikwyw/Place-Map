import { parseArgs } from 'node:util'
import { required } from './env.ts'

/**
 * Point Telegram at the Worker, or unhook it.
 *
 *   pnpm --filter @place-map/scripts webhook -- --url https://place-map-api.you.workers.dev
 *   pnpm --filter @place-map/scripts webhook -- --info
 *   pnpm --filter @place-map/scripts webhook -- --delete
 *
 * Registration is a one-off, but it has to be redone whenever the Worker's URL
 * changes or the secret is rotated.
 */

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    info: { type: 'boolean', default: false },
    delete: { type: 'boolean', default: false },
  },
})

const token = required('TELEGRAM_BOT_TOKEN')

async function call(method: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json()) as { ok: boolean; result?: unknown; description?: string }
  if (!body.ok) throw new Error(`${method}: ${body.description}`)
  return body.result
}

async function main() {
  if (values.info) {
    console.log(JSON.stringify(await call('getWebhookInfo'), null, 2))
    return
  }

  if (values.delete) {
    await call('deleteWebhook', { drop_pending_updates: true })
    console.log('Webhook deleted.')
    return
  }

  if (!values.url) {
    console.error('Pass --url https://your-worker-url (no trailing slash), or --info / --delete')
    process.exit(1)
  }

  const secret = required('TELEGRAM_WEBHOOK_SECRET')
  const url = `${values.url.replace(/\/+$/, '')}/webhook/telegram`

  await call('setWebhook', {
    url,
    secret_token: secret,
    // The bot only ever acts on these two. Anything else is bandwidth and
    // request quota spent on updates that hit `return` immediately.
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  })

  console.log(`Webhook set to ${url}`)
  console.log(JSON.stringify(await call('getWebhookInfo'), null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
