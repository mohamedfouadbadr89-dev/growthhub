require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Webhook } = require('svix');
const { supabase } = require('./lib/supabase');
const { requireAuth } = require('./middleware/auth');
const { aiRateLimiter } = require('./middleware/rate-limit');
const openrouterService = require('./services/openrouter.service');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Logger
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

// Test Route
app.get("/test-webhook", (req, res) => {
  res.send("OK");
});

/**
 * AI Generation Endpoint
 * Security: 
 * - Mandatory Auth (Clerk JWT)
 * - Org-based rate limiting (20 req/min)
 * - Strict org_id isolation from req.auth
 */
app.post('/api/v1/ai/generate', requireAuth, aiRateLimiter, async (req, res) => {
  const { prompt, model } = req.body;
  const { userId, orgId } = req.auth;
  const startTime = Date.now();

  // 1. Input Validation - Task 3
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'Prompt is required' });
  }

  const cleanPrompt = prompt.trim();
  if (cleanPrompt.length < 5 || cleanPrompt.length > 2000) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Prompt must be between 5 and 2000 characters' 
    });
  }

  try {
    console.log(`[AI] Request started for org: ${orgId}`);
    
    const content = await openrouterService.generateCreative({ prompt: cleanPrompt, model });
    const latency = Date.now() - startTime;

    // 2. Audit Log (Success) - Task 4
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      actor_id: userId,
      action: 'ai_generate',
      resource: 'creative',
      metadata: { 
        model: model || 'google/gemini-2.0-flash-001', 
        prompt_length: cleanPrompt.length,
        latency_ms: latency,
        status: 'success',
        cost_estimate: 0.0001 // Static fallback for google/gemini-2.0-flash-001
      }
    });

    res.json({ content });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // 3. Fail Loudly (Internal) - Task 6
    console.error(`--- AI GENERATION FAILURE [${orgId}] ---`);
    console.error('Error:', error.stack || error.message);
    console.error('Payload:', JSON.stringify(req.body));

    // Audit Log (Failure) - Task 4
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      actor_id: userId,
      action: 'ai_generate',
      resource: 'creative',
      metadata: { 
        model: model || 'google/gemini-2.0-flash-001', 
        error: error.message,
        latency_ms: latency,
        status: 'failed',
        cost_estimate: 0
      }
    });

    // 4. Safe Error (Frontend)
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message || 'AI generation failed' 
    });
  }
});

// Clerk webhook route
app.post('/api/v1/webhooks/clerk', express.json(), (req, res) => {
  console.log('--- WEBHOOK HIT ---');
  
  // IMMEDIATELY SEND 200 - Task 1 & 2
  res.status(200).json({ received: true });

  // Move ALL processing into background - Task 3
  setImmediate(async () => {
    try {
      const evt = req.body;
      const eventType = evt.type;

      console.log(`Processing background task for event: ${eventType}`);
      console.log('Payload Received:', JSON.stringify(evt, null, 2));

      if (eventType === 'user.created') {
        const { email_addresses, id: clerk_id } = evt.data;
        
        if (!email_addresses || email_addresses.length === 0) {
          console.error('No email address provided in Clerk event');
          return;
        }

        const email = email_addresses[0].email_address;
        const org_id = `org_${clerk_id}`;

        console.log(`Creating resources for user ${clerk_id}...`);

        // 1. Create Organization
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            org_id: org_id,
            name: 'Default Org',
            plan_type: 'subscription'
          });

        if (orgError) {
          console.error('FAILED to create organization:', orgError.message);
          return;
        }

        // 2. Create User linked to the organization
        const { error: userError } = await supabase
          .from('users')
          .insert({
            clerk_id: clerk_id,
            email: email,
            org_id: org_id,
            role: 'admin'
          });

        if (userError) {
          console.error('FAILED to create user:', userError.message);
          return;
        }

        console.log(`SUCCESS: Synced user ${clerk_id} and created org ${org_id}`);
      } else {
        console.log(`Ignored event: ${eventType}`);
      }
    } catch (err) {
      // Full error and payload logging - Task 4
      console.error('--- CRITICAL WEBHOOK BACKGROUND ERROR ---');
      console.error('Error Details:', err);
      console.error('Payload at time of error:', JSON.stringify(req.body, null, 2));
    }
  });
});

// Middleware for other routes
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Basic Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`--- SERVER STARTUP ---`);
  console.log(`Backend API running on port ${PORT}`);
  console.log(`Listening on 0.0.0.0 (Accessible externally)`);
  console.log(`Health endpoint: http://localhost:${PORT}/api/v1/health`);
});
