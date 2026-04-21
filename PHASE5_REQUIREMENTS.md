# PHASE 5 REQUIREMENTS — Creatives

**Status:** Ready to start (all Phase 1-4 complete and verified)

---

## CRITICAL CONSTRAINTS (NON-NEGOTIABLE)

### 1. Storage Architecture
- ✅ Supabase Storage buckets created: `brand-assets` (private), `creatives` (private)
- ✅ Buckets are **private — no public access**
- ✅ RLS policies enforce org_id isolation
- File structure: `org_id/*`
- Access: signed URLs only (backend-generated)
- Upload: backend-only (no direct client uploads)

### 2. Image Generation Strategy
**DO NOT hardcode providers.** Use abstraction layer:

```
Route → ImageService → Provider
```

Providers:
- **OpenRouter** — copy generation, creative intelligence
- **SiliconFlow** — image generation (Flux/SD)
- **Kolors (Kwai)** — commercial creatives (TBD)

Rules:
- ❌ No direct image API calls from routes
- ❌ No provider selection from frontend
- ✅ All image generation routed through backend
- ✅ Provider keys in .env or Supabase Vault
- ✅ Service layer can switch providers without route changes

### 3. Security — ABSOLUTE
- ❌ Never expose image API keys to frontend
- ❌ Never call image APIs directly from client
- ✅ Backend is the only layer handling secrets
- ✅ All image operations logged in audit_logs
- ✅ org_id isolation on every operation

### 4. AI Cost Control — STRICT
Model restrictions:
- Whitelist: specific models only (no arbitrary access)
- max_tokens: ≤ 300
- temperature: 0.7
- Rate limit: 20 requests/min per org
- Retry: max 1 retry on failure

Audit logging:
- org_id
- model used
- latency_ms
- status (success/failed)
- cost_estimate

Goal: Prevent cost leakage and predictable AI spend.

### 5. Data Normalization — REQUIRED
**All creative data must follow unified contracts.**

Brand Kit Input:
```json
{
  "org_id": "org_xxx",
  "name": "Brand Name",
  "logo_url": "signed_url",
  "primary_color": "#hex",
  "secondary_colors": ["#hex", ...],
  "fonts": ["font_name", ...],
  "tone_of_voice": "descriptive text"
}
```

Creative Output:
```json
{
  "org_id": "org_xxx",
  "type": "image | copy | video",
  "format": "1:1 | 16:9 | 9:16",
  "content": "url or text",
  "performance_score": 0-100,
  "metadata": {
    "model_used": "string",
    "generation_time_ms": number,
    "brand_kit_id": "uuid"
  }
}
```

---

## PHASE 5 DELIVERABLES

### Milestone 1: Brand Kit Management
- [ ] `brand_kits` table with org_id isolation + RLS
- [ ] Upload logo, colors, fonts to Supabase Storage
- [ ] Store brand metadata (tone of voice, guidelines)
- [ ] Backend endpoint: POST/GET/DELETE /api/v1/brand-kit
- [ ] Frontend: `app/creatives/brand-kit/page.tsx`
- [ ] Signed URL generation for secure asset access

### Milestone 2: Creative Generation
- [ ] `creatives` table with org_id isolation + RLS
- [ ] `creative_generations` table (logs + metadata)
- [ ] ImageService abstraction layer
- [ ] Backend endpoint: POST /api/v1/creatives/generate
- [ ] Support: copy + image generation in parallel
- [ ] Response: {url, performance_score, metadata}
- [ ] Frontend: `app/creatives/page.tsx` (generator UI)

### Milestone 3: Creative Results & Management
- [ ] Rank creatives by performance_score
- [ ] Batch generation (create multiple variants)
- [ ] Edit / delete creatives (backend-only)
- [ ] Audit log all creative actions
- [ ] Frontend: `app/creatives/results/page.tsx` (gallery)
- [ ] Frontend: `app/creatives/editor/page.tsx` (edit UI)

### Milestone 4: Integration with Campaigns
- [ ] Link creatives to campaigns (campaign_creatives junction table)
- [ ] Push creative to Meta/Google Ads (Phase 6 prep)
- [ ] A/B test variants (future: Phase 6+)

---

## DATABASE MIGRATIONS REQUIRED

### Migration 20260420000005_creatives.sql

```sql
-- brand_kits
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES organizations(org_id),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_colors TEXT[],
  fonts TEXT[],
  tone_of_voice TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON brand_kits FOR ALL USING (org_id = auth.jwt()->>'org_id');

-- creatives
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES organizations(org_id),
  brand_kit_id UUID REFERENCES brand_kits(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'copy', 'video')),
  format TEXT,
  content TEXT NOT NULL,
  performance_score INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON creatives FOR ALL USING (org_id = auth.jwt()->>'org_id');

-- creative_generations (audit trail)
CREATE TABLE creative_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  creative_id UUID REFERENCES creatives(id),
  model_used TEXT,
  generation_time_ms INT,
  status TEXT CHECK (status IN ('success', 'failed', 'pending')),
  cost_estimate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE creative_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_read" ON creative_generations FOR SELECT USING (org_id = auth.jwt()->>'org_id');

-- campaign_creatives (junction)
CREATE TABLE campaign_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  campaign_id UUID NOT NULL,
  creative_id UUID NOT NULL REFERENCES creatives(id),
  variant_group TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaign_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON campaign_creatives FOR ALL USING (org_id = auth.jwt()->>'org_id');
```

---

## BACKEND SERVICES TO IMPLEMENT

### 1. ImageService (`backend/src/services/ai/image.ts`)
```typescript
interface ImageRequest {
  prompt: string;
  format: '1:1' | '16:9' | '9:16';
  style?: string;
  org_id: string;
}

interface ImageResponse {
  url: string;
  model_used: string;
  generation_time_ms: number;
  cost_estimate: number;
}

export async function generateImage(req: ImageRequest): Promise<ImageResponse>
export async function generateBatch(requests: ImageRequest[]): Promise<ImageResponse[]>
```

### 2. BrandKitService (`backend/src/services/creatives/brand-kit.ts`)
```typescript
export async function createBrandKit(data: BrandKitInput, org_id: string)
export async function getBrandKit(org_id: string)
export async function updateBrandKit(id: string, data: Partial<BrandKitInput>, org_id: string)
export async function deleteBrandKit(id: string, org_id: string)
```

### 3. CreativeService (`backend/src/services/creatives/creative.ts`)
```typescript
export async function generateCreative(req: GenerateCreativeRequest, org_id: string)
export async function rankCreatives(org_id: string): Promise<Creative[]>
export async function batchGenerate(requests: GenerateCreativeRequest[], org_id: string)
export async function deleteCreative(id: string, org_id: string)
```

### 4. StorageService (`backend/src/services/storage.ts`)
```typescript
export async function uploadBrandAsset(file: File, org_id: string): Promise<{url: string}>
export async function generateSignedUrl(path: string, org_id: string, expiresIn: number)
export async function deleteAsset(path: string, org_id: string)
```

---

## ENVIRONMENT VARIABLES (ADD TO .env)

```
# Image Generation
IMAGE_PROVIDER=siliconflow  # or 'kolors', configurable
SILICONFLOW_API_KEY=...
KOLORS_API_KEY=...

# Supabase Storage
SUPABASE_STORAGE_BUCKET_BRAND_ASSETS=brand-assets
SUPABASE_STORAGE_BUCKET_CREATIVES=creatives

# Cost Control
AI_RATE_LIMIT_PER_ORG_PER_MIN=20
AI_MAX_TOKENS=300
AI_TEMPERATURE=0.7
```

---

## API ENDPOINTS (BACKEND)

### Brand Kit
```
POST   /api/v1/brand-kit          — Create
GET    /api/v1/brand-kit          — Read
PUT    /api/v1/brand-kit          — Update
DELETE /api/v1/brand-kit          — Delete
```

### Creative Generation
```
POST   /api/v1/creatives/generate          — Generate single
POST   /api/v1/creatives/generate-batch    — Generate multiple
GET    /api/v1/creatives                   — List all (ranked)
GET    /api/v1/creatives/:id               — Get one
PUT    /api/v1/creatives/:id               — Update (metadata)
DELETE /api/v1/creatives/:id               — Delete
```

### Storage
```
POST   /api/v1/storage/upload-brand-asset  — Upload to brand-assets bucket
POST   /api/v1/storage/signed-url          — Get signed URL for asset
```

---

## FRONTEND PAGES

### 1. Brand Kit (`app/creatives/brand-kit/page.tsx`)
- Display current brand kit
- Upload logo (to Supabase Storage)
- Edit colors, fonts, tone of voice
- Save / preview

### 2. Creative Generator (`app/creatives/page.tsx`)
- Form: type (image/copy), format, style, quantity
- Progress indicator (generation in progress)
- Display generated creatives as they complete
- Performance score for each

### 3. Creative Results (`app/creatives/results/page.tsx`)
- Gallery of all creatives (ranked by performance_score)
- Filter by type, format, date
- Edit / delete / duplicate
- A/B test prep (tag variants)

### 4. Creative Editor (`app/creatives/editor/page.tsx`)
- Load existing creative
- Edit prompt / content
- Regenerate
- Save as new version

---

## TESTING REQUIREMENTS

Before Phase 6:

1. **Brand Kit Upload Test**
   - Upload logo to Supabase Storage
   - Verify signed URL works
   - Verify org_id isolation (user from different org can't access)

2. **Image Generation Test**
   - Request image via /api/v1/creatives/generate
   - Verify ImageService routes to correct provider
   - Verify cost logged in creative_generations
   - Verify audit_logs has entry

3. **Creative Ranking Test**
   - Generate 5 creatives
   - Verify they appear in results ranked by performance_score
   - Verify org_id isolation

4. **Cost Control Test**
   - Make 21 requests in 1 minute
   - Verify 21st request rate-limited (HTTP 429)
   - Verify cost_estimate in audit logs is accurate

5. **Storage Isolation Test**
   - User A uploads brand asset
   - Verify User B (different org) cannot access via signed URL

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Do NOT hardcode image providers.** Always use abstraction layer.
2. **Do NOT expose API keys to frontend.** All image generation is backend-only.
3. **Do NOT skip RLS policies.** Every table must have org_id isolation.
4. **Do NOT add public buckets.** All Supabase Storage must be private.
5. **Do NOT skip audit logging.** Every creative action is logged.
6. **Do NOT use raw API responses.** Normalize all data to internal contracts.
7. **If you need to understand marketing metrics (CAC, ROAS, LTV)** — ask Badr. He's the expert.
8. **If you need to understand brand strategy or creative direction** — ask Badr. He's the expert.
9. **If you find missing SQL migrations** — generate them and apply via `supabase db push`.
10. **If you find bugs in existing code** — fix them if they don't break architecture.

---

## NEXT STEPS FOR CLAUDE CODE

1. ✅ Read CLAUDE.md, PHASES.md, CONSTITUTION.md
2. ✅ Read this file (PHASE5_REQUIREMENTS.md)
3. Review existing Phase 2-4 implementation for any gaps
4. Generate missing SQL migrations and apply them
5. Implement missing services (ImageService, StorageService, etc.)
6. Run: `/speckit-specify Phase 5 — Creatives`
7. Claude Code generates spec with all 4 milestones
8. Implement with full org_id isolation
9. Run integration tests before Phase 6