import type { ErrorHandler } from 'hono'
import * as Sentry from '@sentry/node'

Sentry.init({ dsn: process.env.SENTRY_DSN })

export const errorHandler: ErrorHandler = (err, c) => {
  Sentry.captureException(err)
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
}
