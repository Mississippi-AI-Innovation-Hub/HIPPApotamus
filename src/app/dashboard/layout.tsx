import type { ReactNode } from "react";
import { getRequiredSession } from "@/lib/auth/session";
import { ToastProvider } from "@/components/ui/Toast";

export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await getRequiredSession();

  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
