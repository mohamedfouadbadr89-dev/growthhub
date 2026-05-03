import { createClient } from '@supabase/supabase-js'

// Placeholders let the server start without env vars (health check works);
// actual DB calls will fail until SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
const supabaseUrl = process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
