export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-surface-light text-dark">

            {/* Sidebar */}
            <aside className="w-[260px] p-8 bg-surface-lighter rounded-r-[40px]">
                <div className="font-semibold">AI Execution OS</div>
            </aside>

            {/* Main */}
            <main className="flex-1 p-8">
                {children}
            </main>

        </div>
    );
}