import type { ReactNode } from "react";
import { getRequiredSession } from "@/lib/auth/session";
import { ToastProvider } from "@/components/ui/Toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardRootLayout({ children }: DashboardLayoutProps) {
  const session = await getRequiredSession();

  return (
    <ToastProvider>
      <DashboardLayout
        userName={session.name}
        userRole={session.role}
        userEmail={session.email}
      >
        {children}
      </DashboardLayout>
    </ToastProvider>
  );
}
