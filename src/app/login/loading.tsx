export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-[420px] rounded-lg bg-white p-8 shadow-sm border border-[#E2E8F0]">
        {/* Logo skeleton */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-14 w-14 animate-pulse rounded-md bg-[#CCFBF1]" />
          <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-44 animate-pulse rounded bg-slate-50" />
        </div>

        {/* Form skeleton */}
        <div className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded border border-[#E2E8F0] bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded border border-[#E2E8F0] bg-slate-50" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-[#CCFBF1]" />
        </div>

        {/* Footer skeleton */}
        <div className="mt-8 flex justify-center">
          <div className="h-3 w-56 animate-pulse rounded bg-slate-50" />
        </div>
      </div>
    </div>
  );
}
