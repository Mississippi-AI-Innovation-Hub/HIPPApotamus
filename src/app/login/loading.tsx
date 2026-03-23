export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-md rounded-xl bg-card p-10 shadow-lg ring-1 ring-foreground/10">
        {/* Logo skeleton */}
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 animate-pulse rounded-xl bg-primary/15" />
          <div className="h-10 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-52 animate-pulse rounded bg-muted/60" />
        </div>

        {/* Form skeleton */}
        <div className="mt-10 space-y-5">
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg border border-input bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg border border-input bg-muted/40" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-lg bg-primary/15" />
        </div>

        {/* Separator skeleton */}
        <div className="mt-8 h-px w-full bg-border" />

        {/* Footer skeleton */}
        <div className="mt-4 flex justify-center">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
