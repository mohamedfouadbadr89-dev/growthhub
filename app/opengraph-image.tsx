import { ImageResponse } from "next/og"

/**
 * Default Open Graph + Twitter card image for GrowthHub.
 *
 * Next.js convention: a file named opengraph-image.tsx in the app directory
 * is automatically wired to <meta property="og:image"> for every page
 * unless a more specific opengraph-image is defined deeper in the route
 * tree. Twitter inherits via metadata fallback.
 *
 * Design tokens come from CLAUDE.md §8 (primary #005bc4, foreground
 * #05345c). Wordmark is intentionally minimal — there is no public
 * marketing surface yet (governance-deferred per Phases.md), so the OG
 * image surfaces the brand identity for direct-link shares (Slack, email,
 * X) without making product claims that aren't yet shippable.
 */

export const alt = "GrowthHub — AI-powered Growth Operating System"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #005bc4 0%, #05345c 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            fontSize: 112,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          GrowthHub
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            fontWeight: 400,
            opacity: 0.85,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          AI-powered Growth Operating System
        </div>
      </div>
    ),
    size,
  )
}
