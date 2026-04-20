import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { health } from './routes/health.js'
import { v1 } from './routes/v1/index.js'
import { errorHandler } from './middleware/error.js'

const requiredEnvVars = ['CLERK_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`)
    process.exit(1)
  }
}

type Variables = { userId: string; orgId: string }

const app = new Hono<{ Variables: Variables }>()

app.use('*', logger())
app.route('/health', health)
app.route('/api/v1', v1)
app.onError(errorHandler)

const port = Number(process.env.PORT) || 3001
serve({ fetch: app.fetch, port }, () => {
  console.log(`GrowthHub backend running on port ${port}`)
})
