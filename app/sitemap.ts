import type { MetadataRoute } from "next"

/**
 * Sitemap for GrowthHub.
 *
 * The application is an authenticated SaaS (every route under /dashboard,
 * /campaigns, /decisions, /actions, /automation, /creatives, /integrations,
 * /settings is Clerk-protected per middleware.ts). Public-discoverable
 * surface is intentionally minimal: only the root landing/redirect page.
 *
 * NOT in this sitemap (by design):
 *  - /sign-in, /sign-up — auth flows, not content
 *  - any /dashboard/* or other authenticated routes — robots.ts disallows
 *
 * If a future phase adds a public marketing surface (currently
 * GOVERNANCE-DEFERRED per specs/SYSTEM_CONTROL.md), append entries here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://growthhub.app"

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
  ]
}
