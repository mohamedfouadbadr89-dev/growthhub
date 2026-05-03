# Feature Specification: Phase 5 — AI Creatives

**Feature Branch**: `claude/init-growthhub-PaRUm`
**Created**: 2026-04-20
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Set Up Brand Kit (Priority: P1)

A brand manager uploads their organization's identity assets — logo, color palette, fonts, and tone of voice — so that all AI-generated creatives are visually and tonally consistent with their brand.

**Why this priority**: Brand Kit is the prerequisite for all creative generation. Without it, the AI has no brand context to apply to generated content. It is independently testable with no dependency on sync data.

**Independent Test**: Navigate to `/creatives/brand-kit`, upload a logo image, define at least two brand colors, select a font style, and write a tone of voice description. Save. Reload the page and verify all fields are preserved exactly as entered.

**Acceptance Scenarios**:

1. **Given** an organization with no brand kit, **When** the user uploads a logo and saves, **Then** the logo appears in the brand kit page and is available to all future creative generation requests for that organization.
2. **Given** an existing brand kit, **When** the user updates the tone of voice and saves, **Then** the new tone is used in all subsequent copy generation for that organization.
3. **Given** a brand kit with two colors defined, **When** a creative is generated, **Then** the generated image reflects those colors in its visual style.
4. **Given** a user from a different organization, **When** they view the Brand Kit page, **Then** they see only their organization's brand assets — never another organization's.

---

### User Story 2 — Generate Ad Copy (Priority: P2)

A marketer selects a campaign from their synced data, chooses copy generation, and receives AI-generated headlines, body text, and CTAs tailored to their brand voice and the campaign's performance context.

**Why this priority**: Copy generation is the fastest and most accessible form of creative output — no image storage or external image APIs required. Delivers immediate value once Brand Kit is set up.

**Independent Test**: With a brand kit saved and at least one synced campaign in the system, navigate to `/creatives`, select a campaign, choose "Generate Copy". Verify a generation job is queued, and within 60 seconds the Results page shows at least one creative with a headline, body, and CTA.

**Acceptance Scenarios**:

1. **Given** a brand kit and a connected campaign, **When** the user triggers copy generation, **Then** within 60 seconds the Results page displays at least 3 copy variations each containing a headline (under 10 words), body text (under 50 words), and a CTA phrase.
2. **Given** a campaign with high ROAS (e.g. 4×), **When** copy is generated, **Then** the performance score assigned to the creative is higher than one generated from a low-ROAS campaign.
3. **Given** a generation request while the AI service is unavailable, **When** the job fails, **Then** the creative_generations record shows `status = 'failed'` and the user sees a clear error message with a retry option.
4. **Given** an LTD user with no BYOK key configured, **When** they attempt copy generation, **Then** they are blocked with a prompt to add their AI key in Settings before proceeding.

---

### User Story 3 — Generate Ad Images (Priority: P3)

A marketer selects a campaign, chooses image generation, and receives AI-generated ad images styled with their brand colors and logo aesthetic.

**Why this priority**: Image generation completes the full creative suite. It depends on an external image generation service and Supabase Storage being configured — more dependencies than copy generation, hence lower priority.

**Independent Test**: With a brand kit (including at least two colors and a logo) and a connected campaign, trigger image generation. Within 3 minutes, verify the Results page shows at least one image creative with a valid image URL accessible from the browser, and the image is stored in the `creatives` storage bucket.

**Acceptance Scenarios**:

1. **Given** a brand kit with colors and a logo, **When** the user triggers image generation for a campaign, **Then** within 3 minutes the Results page shows at least 2 image creatives with viewable thumbnails.
2. **Given** a generated image, **When** the user clicks "Download", **Then** the image file downloads to the user's device in a standard format (PNG or JPEG).
3. **Given** an image generation job in progress, **When** the user refreshes the Results page, **Then** they see a "Generating…" status indicator until the job completes.
4. **Given** an image generation failure (external service error), **When** the job fails, **Then** the user sees a failure state and can retry without losing their generation parameters.

---

### User Story 4 — Browse and Edit Generated Creatives (Priority: P4)

A marketer browses all creatives generated for their organization in a gallery view, can preview full-size images, and can edit copy creatives (headline, body, CTA) before downloading or saving.

**Why this priority**: The Results and Editor pages are the consumption layer — they close the loop on the creation workflow. Copy editing is high value because it lets marketers personalize AI output before publishing.

**Independent Test**: After generating at least one copy creative and one image creative, navigate to `/creatives/results`. Verify both appear in the gallery. Click a copy creative, edit the headline, save. Verify the saved text persists on reload. Click an image creative, verify the full-size preview loads.

**Acceptance Scenarios**:

1. **Given** multiple generated creatives, **When** the user opens the Results page, **Then** all creatives for the organization are displayed sorted by performance score descending, with type badges (image / copy).
2. **Given** a copy creative in the editor, **When** the user modifies the headline and saves, **Then** the updated text replaces the original and the performance score is preserved.
3. **Given** an image creative, **When** the user opens the Creative Editor, **Then** a full-size preview is shown alongside the performance score and the campaign it was generated from.
4. **Given** a copy creative, **When** the user clicks "Download", **Then** a text file containing headline, body, and CTA is downloaded.

---

### Edge Cases

- What happens when a brand kit has no logo uploaded? Generation proceeds with color-only brand context; a warning is shown for image generation that logo style transfer will be skipped.
- What happens when no campaigns are synced? The generator shows an empty campaign selector with a prompt to connect an integration first.
- What happens when a generation job takes longer than 5 minutes? The job is marked `failed` and the user is notified with a retry option.
- What happens when the `creatives` storage bucket is full or unavailable? Image generation fails gracefully with a clear error; copy generation is unaffected.
- What happens if the user generates creatives and then disconnects the source campaign's integration? Existing creatives remain accessible; the performance score is frozen at the value computed at generation time.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow org admins to upload a logo image, define up to 10 brand colors, set font preferences, and write a tone of voice description in the Brand Kit.
- **FR-002**: System MUST persist the Brand Kit per organization so that all members of the org see the same brand settings.
- **FR-003**: System MUST allow users to select any synced campaign as the context source for a creative generation request.
- **FR-004**: System MUST support two generation types: "Ad Copy" (produces headline + body + CTA as text) and "Ad Image" (produces a visual ad image file).
- **FR-005**: System MUST queue creative generation as a background job so that users are not blocked waiting on the page.
- **FR-006**: System MUST assign a performance score (0–100) to each generated creative based on the historical ROAS of the source campaign: higher ROAS → higher score.
- **FR-007**: System MUST store generated image files in organization-scoped cloud storage; images must be accessible via a permanent URL.
- **FR-008**: System MUST display generation status (pending / processing / completed / failed) in real time or near-real time without requiring a page reload.
- **FR-009**: System MUST allow users to edit the headline, body, and CTA of any copy creative after generation.
- **FR-010**: System MUST allow users to download copy creatives as text and image creatives as image files.
- **FR-011**: System MUST enforce LTD user BYOK gate: LTD users with no AI key configured cannot trigger generation and are shown a prompt to add their key.
- **FR-012**: System MUST scope all brand kits, generation jobs, and creatives to `org_id` — users never see another organization's data.
- **FR-013**: System MUST support retrying a failed generation job with the same parameters.

### Key Entities

- **Brand Kit**: Organization's visual and tonal identity — logo image reference, color palette (array of hex values), font preferences, tone of voice text. One per organization.
- **Creative Generation**: A generation job record — links to source campaign, generation type, AI model used, prompt used, current status, error message if failed. One job may produce multiple creatives.
- **Creative**: A single generated output — type (image or copy), content URL (for images), content text structured as `{ headline, body, cta }` (for copy), performance score, link to the generation job that produced it.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete Brand Kit setup (logo + colors + tone) in under 3 minutes from a blank state.
- **SC-002**: Ad copy generation produces at least 3 variations within 60 seconds of the user triggering the request.
- **SC-003**: Ad image generation produces at least 2 image creatives within 3 minutes of triggering.
- **SC-004**: 100% of generated creatives are scoped to the correct organization — cross-org data leakage results in immediate test failure.
- **SC-005**: The performance score correctly ranks creatives: a creative from a campaign with ROAS ≥ 3× receives a score at least 20 points higher than one from a campaign with ROAS < 1×.
- **SC-006**: Copy editing saves and persists within 2 seconds; refreshing the page shows the edited text.
- **SC-007**: Image download completes in under 10 seconds for files up to 5 MB.
- **SC-008**: Failed generation jobs show a user-visible error state within 5 minutes of the job starting; retry is available without re-entering parameters.

---

## Assumptions

- Users have already completed Phase 2 (Data Ingestion) — at least one platform integration is connected and campaign metrics are synced before using the Creative Generator.
- The organization's AI key (BYOK for LTD, or platform key for subscription) is already configured — key management itself is out of scope for this phase.
- The `creatives` storage bucket in Supabase Storage is pre-created and publicly readable (images are served via signed or public URLs).
- Image generation is assumed to be a synchronous or webhook-based call to an external image AI service; the exact API response format is an implementation detail.
- Logo upload accepts PNG and JPEG formats up to 5 MB; other formats are rejected with a clear error.
- Copy generation produces exactly 3 variations per request; image generation produces exactly 2 images per request.
- Performance score is computed at generation time using the latest available ROAS for the source campaign and does not update retroactively.
- Creative editing is limited to copy creatives — image creatives cannot be edited in-app (only downloaded).
- All org members (admin and member roles) can generate and view creatives; only admins can update the Brand Kit.
