# Quickstart: Frontend → Backend Integration

**Feature**: 007-frontend-api-integration
**Date**: 2026-04-21

---

## Verification Scenarios

### Scenario 1: CORS Enabled (verify first)

1. Start the frontend dev server and open the browser's Network tab
2. Navigate to any page that calls the backend (e.g., Dashboard)
3. Look for the preflight `OPTIONS` request to `72.62.131.250:3001`
4. **Pass**: Response includes `Access-Control-Allow-Origin: http://localhost:3000`
5. **Fail**: Response missing CORS headers → browser blocks the request, page shows network error

---

### Scenario 2: Dashboard KPI Tiles Show Real Data

1. Sign in as an organization with at least one connected integration and synced campaigns
2. Navigate to Dashboard Overview
3. **Loading state**: Skeleton placeholders visible immediately
4. **Success state**: Spend, Revenue, ROAS, Impressions, Clicks tiles show real numbers
5. **Verify**: Numbers match what the backend database contains (not hardcoded values)

---

### Scenario 3: Dashboard Campaigns Table Shows Real Campaigns

1. Same setup as Scenario 2
2. The bottom table on Dashboard Overview shows the organization's actual campaigns
3. **Pass**: Campaign names, platforms, and metrics match `GET /api/v1/campaigns`
4. **Fail**: Table shows Spring Collection 2024 / Brand Search EMEA / UGC Influencer Push (these are hardcoded mock entries that must be removed)

---

### Scenario 4: Empty State Renders (not blank)

1. Sign in as a brand new organization with no data
2. Navigate to Dashboard Overview
3. **Pass**: Empty state shown with "Connect your first integration" or similar CTA — not a blank page or JavaScript error
4. Navigate to Decisions, Actions, History, Integrations
5. **Pass**: Each shows its own purposeful empty state

---

### Scenario 5: Session Expiry Message

1. In the browser console: `localStorage.clear(); sessionStorage.clear()`
2. Manually tamper with the token or wait for it to expire
3. Navigate to any page
4. **Pass**: "Your session expired — please sign in again" message appears — not a raw `401` or blank
5. There should be a sign-in link alongside the message

---

### Scenario 6: Retry Button Works

1. Disconnect network (browser DevTools → Network → Offline)
2. Navigate to Decisions page
3. **Pass**: "Connection failed — check your internet connection" message + "Try Again" button
4. Reconnect network
5. Click "Try Again"
6. **Pass**: Page loads data successfully

---

### Scenario 7: JWT in Authorization Header

1. Open browser DevTools → Network tab
2. Navigate to Dashboard Overview (page load triggers API call)
3. Click on any request to `72.62.131.250:3001`
4. Check Request Headers
5. **Pass**: `Authorization: Bearer eyJ...` is present
6. **Fail**: Header is missing → all requests would return 401

---

### Scenario 8: No Mock Data Anywhere

```bash
# Run from repo root — must return zero results
grep -r "Spring Collection\|Brand Search EMEA\|UGC Influencer\|chartBars\|mockData" app/ lib/
```

**Pass**: No output (zero matches)
**Fail**: File paths listed → remove the hardcoded arrays from those files

---

### Scenario 9: Decisions & Actions Live

1. Sign in as an org with decisions generated
2. Navigate to Decisions — see list
3. Click a decision — see detail (trigger, confidence score, reasoning)
4. Navigate to Actions Library — see action templates
5. Navigate to Actions → Execution Logs — see past runs or empty state
6. Navigate to Actions → Automation — see rule status or empty state
7. **All**: No console errors, no raw JSON visible in the UI

---

### Scenario 10: Automation History Full Record

1. Navigate to Automation History
2. **Pass**: Table shows columns: Decision, Action Taken, Trigger, Result badge, Confidence, AI Explanation, Date
3. **Pass**: Results are color-coded (success=green, failed=red, skipped=yellow)
4. **Pass**: Clicking a row shows full detail (if detail view exists) or all columns are visible inline
5. **Empty pass**: If no history records, shows contextual empty state (not blank)
