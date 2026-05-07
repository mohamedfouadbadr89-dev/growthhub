import type { MetadataRoute } from "next"

/**
 * Robots policy for GrowthHub.
 *
 * Authenticated SaaS surface: disallow every internal app route from
 * indexing. Allow only the root and the auth pages (sign-in / sign-up are
 * intentionally still allowed so users searching for the product brand can
 * land on the auth flow). All Clerk-protected routes per middleware.ts
 * are explicitly excluded.
 *
 * /api/* is excluded because it is a JSON surface, not user content.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://growthhub.app"

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up"],
        disallow: [
          "/dashboard/",
          "/campaigns/",
          "/decisions/",
          "/actions/",
          "/automation/",
          "/creatives/",
          "/integrations/",
          "/settings/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
