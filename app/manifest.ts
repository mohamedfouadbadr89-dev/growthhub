import type { MetadataRoute } from "next"

/**
 * Web App Manifest for GrowthHub.
 *
 * Theme + background colors mirror the design tokens declared in CLAUDE.md
 * §8 (primary #005bc4, background #f8f9ff). start_url targets the
 * authenticated dashboard overview — Clerk middleware will redirect
 * unauthenticated launches to /sign-in.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GrowthHub — Growth Operating System",
    short_name: "GrowthHub",
    description:
      "AI-powered Growth Operating System for ecommerce/DTC brands: a closed-loop decision engine that turns data into decisions, decisions into actions, and outcomes into learning.",
    start_url: "/dashboard/overview",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#005bc4",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
