import { Hono } from 'hono'

const health = new Hono()

health.get('/', (c) =>
  c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
)

export { health }
