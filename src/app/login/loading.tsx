export default function LoginLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, rgba(15,118,110,0.05) 0%, transparent 70%), var(--background)",
      }}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-card p-8 shadow-premium">
        {/* Logo skeleton */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 animate-pulse rounded-xl bg-primary/15" />
          <div className="mt-4 h-10 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted/60" />
        </div>

        {/* Form skeleton */}
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl border border-input bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl border border-input bg-muted/40" />
          </div>
          <div className="h-12 w-full animate-pulse rounded-xl bg-primary/15" />
        </div>

        {/* Footer skeleton */}
        <div className="mt-4 flex justify-center">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
