import type { Metadata } from "next";

import { Manrope, Inter } from "next/font/google";

import { ClerkProvider, OrganizationSwitcher } from "@clerk/nextjs";

import "./globals.css";

const manrope = Manrope({

  variable: "--font-manrope",

  subsets: ["latin"],

  weight: ["200", "400", "600", "700", "800"],

});

const inter = Inter({

  variable: "--font-inter",

  subsets: ["latin"],

  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],

});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://growthhub.app",
  ),
  title: {
    default: "GrowthHub — AI-powered Growth Operating System",
    template: "%s · GrowthHub",
  },
  description:
    "A closed-loop decision engine for ecommerce/DTC brands: detects signals, generates decisions, executes actions, and learns from outcomes — automatically.",
  applicationName: "GrowthHub",
  openGraph: {
    title: "GrowthHub — AI-powered Growth Operating System",
    description:
      "Closed-loop growth automation: data → insight → decision → action → result → learning.",
    type: "website",
    siteName: "GrowthHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowthHub — AI-powered Growth Operating System",
    description:
      "Closed-loop growth automation: data → insight → decision → action → result → learning.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  return (

    <ClerkProvider>

      <html

        lang="en"

        className={`${manrope.variable} ${inter.variable} h-full antialiased`}

      >

        <body className="min-h-full flex flex-col font-body">

          

          {/* 🔥 Header */}

          <div className="w-full flex justify-end items-center px-6 py-4 border-b">

            <OrganizationSwitcher

              appearance={{

                elements: {

                  rootBox: "flex items-center",

                },

              }}

            />

          </div>

          {/* 🔽 باقي التطبيق */}

          {children}

        </body>

      </html>

    </ClerkProvider>

  );

}