# CONSTITUTION.md — Growth OS

## 1. PRIME DIRECTIVES
These rules NEVER break — no exceptions, no shortcuts.

1. **Never expose secrets** — API keys, tokens, credentials never in frontend code or git
2. **Never query DB without org_id** — every single database query must be filtered by org_id
3. **Never bypass auth** — every protected route must verify Clerk token before anything else
4. **Never write to DB from frontend** — all mutations go through Backend API only
5. **Never skip RLS** — every new Supabase table must have Row Level Security enabled immediately

---

## 2. DECISION RULES
When Claude is unsure what to do:

### If the task is ambiguous:
- Default to the MOST SECURE option
- Ask ONE clarifying question — not five
- Never assume missing context means "skip it"

### If two approaches exist:
- Choose the one that's easier to audit
- Choose the one that fails loudly over the one that fails silently
- Choose explicit over clever

### If something seems too complex:
- Break it into the smallest possible working unit
- Ship that unit first
- Never build Layer 3 before Layer 1 works

### If a file already exists:
- Read it before touching it
- Never overwrite without understanding what's there
- Preserve existing logic unless explicitly told to replace it

---

## 3. CODE PRINCIPLES

### Security First
- Encrypt all third-party credentials via Supabase Vault
- Hash API keys before storing — never store plaintext
- Rate limit every public API endpoint
- Log every sensitive action to audit_logs table

### Fail Loudly
- Return clear error messages from API — never silent 200s on failures
- Log errors to Sentry in production
- Every background job must log its result (success/failed/skipped)

### Data Integrity
- Every table has: `id`, `org_id`, `created_at`, `updated_at`
- Soft delete preferred over hard delete (add `deleted_at` column)
- Never delete Decision History records — ever

### Performance
- Never run N+1 queries
- Use Redis cache for repeated reads (campaign metrics, KPIs)
- Paginate all list endpoints — never return unlimited rows

---

## 4. ARCHITECTURE RULES

### Layers — Never Cross These
```
Frontend → Backend API → Database
Frontend → Backend API → External APIs
```
- Frontend never calls Supabase directly
- Frontend never calls Meta/Google/Shopify APIs directly
- Backend is the only layer that touches secrets

### File Placement
- Pages: content only — no sidebar, no header, no layout chrome
- Components: reusable UI only — no business logic
- API routes: validation + auth check + call service layer
- Services: business logic lives here, not in routes

### Naming
- Files: kebab-case (`decision-detail.tsx`)
- Functions: camelCase (`getDecisionById`)
- DB columns: snake_case (`org_id`, `created_at`)
- Constants: UPPER_SNAKE_CASE (`MAX_CREDITS_PER_DAY`)

---

## 5. PHASE DISCIPLINE

- Never start Phase N+1 before Phase N deliverable is confirmed working
- Each phase ends with a working, testable deliverable — not just code written
- Decision History table (Phase 4) is sacred — never simplify its structure
- RLS must be verified after every new table — not "later"

---

## 6. WHAT CLAUDE SHOULD ALWAYS DO

- Read CLAUDE.md at the start of every session
- Read the relevant Phase from PHASES.md before starting work
- Check if a file exists before creating it
- Add `org_id` filter to every DB query without being asked
- Enable RLS on every new table without being asked
- Use Supabase Vault for any credential without being asked
- Test auth rejection (wrong org_id, no token) before marking a task done

---

## 7. WHAT CLAUDE SHOULD NEVER DO

- Never hardcode API keys or tokens anywhere
- Never create a DB table without RLS
- Never return raw database errors to the frontend
- Never build the full feature in one shot — build incrementally
- Never ignore a failing test or lint error
- Never use `any` type in TypeScript without a comment explaining why
- Never delete from `decision_history` table
- Never let LTD users touch the platform OpenRouter key

---

## 8. THE PRODUCT NORTH STAR

Every decision, every line of code should serve this:

**"A self-improving closed-loop system that detects signals, generates decisions, executes actions, and learns from outcomes — automatically."**

If a feature doesn't serve this loop → deprioritize it.
If a shortcut breaks this loop → reject it.