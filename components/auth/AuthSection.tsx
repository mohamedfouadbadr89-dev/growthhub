'use client';

import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";

export function AuthSection() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <div className="w-9 h-9 rounded-lg bg-surface-container-high animate-pulse" />;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 font-body">
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-9 h-9 rounded-lg ring-2 ring-border",
          userButtonPopoverCard: "shadow-xl border border-border rounded-2xl",
        },
      }}
    />
  );
}
