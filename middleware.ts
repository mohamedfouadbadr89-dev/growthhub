import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/actions(.*)",
  "/automation(.*)",
  "/campaigns(.*)",
  "/creatives(.*)",
  "/decisions(.*)",
  "/integrations(.*)",
  "/settings(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // منع المستخدم المسجل من الرجوع لصفحات تسجيل الدخول (حل مشكلة loop)
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL("/dashboard/overview", req.url));
  }

  // حماية الصفحات
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};