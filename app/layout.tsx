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

  title: "Precision Curator Dashboard",

  description: "Executive intelligence layer for scalable growth.",

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