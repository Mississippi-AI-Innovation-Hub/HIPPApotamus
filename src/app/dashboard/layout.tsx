import type { ReactNode } from "react";
import { getRequiredSession } from "@/lib/auth/session";
import { ToastProvider } from "@/components/ui/Toast";
import Sidebar from "@/components/dashboard/Sidebar";

// ─── Types ──────────────────────────────────────────────────────────────────

// Force dynamic rendering — reads session headers
export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: ReactNode;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getRequiredSession();

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-100">
        {/* Sidebar */}
        <Sidebar
          userName={session.name}
          userRole={session.role}
          userEmail={session.email}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
