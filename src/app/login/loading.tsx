export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        {/* Logo skeleton */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-16 w-16 animate-pulse rounded-full bg-teal-100" />
          <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-10 w-full animate-pulse rounded-lg bg-teal-100" />
        </div>

        <div className="mx-auto h-3 w-56 animate-pulse rounded bg-slate-50" />
      </div>
    </div>
  );
}
