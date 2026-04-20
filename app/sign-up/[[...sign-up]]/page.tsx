import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-extrabold text-[18px] tracking-tighter text-foreground leading-none font-sans uppercase">Precision</p>
              <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] leading-none mt-0.5 font-body">Curator</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-body">Create your account and start growing</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
