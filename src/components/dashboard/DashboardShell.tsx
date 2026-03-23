"use client";

import { useCallback, useMemo, useState } from "react";
import type { AuditLog, BAA, UserRole, Vendor } from "@/types";
import Sidebar from "@/components/dashboard/Sidebar";
import StatsRow from "@/components/dashboard/StatsRow";
import BAATable from "@/components/dashboard/BAATable";
import BAADetailsModal from "@/components/dashboard/BAADetailsModal";
import VendorList from "@/components/dashboard/VendorList";
import AddVendorModal from "@/components/dashboard/AddVendorModal";
import ReminderScheduler from "@/components/dashboard/ReminderScheduler";
import AuditPacketModal from "@/components/dashboard/AuditPacketModal";
import DevTools from "@/components/dashboard/DevTools";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  vendors: Vendor[];
  baas: BAA[];
  auditLogs: AuditLog[];
  userName: string;
  userRole: UserRole;
  userEmail: string;
}

type Tab = "contracts" | "vendors" | "reminders";

// ─── Tabs Config ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: string }[] = [
  {
    key: "contracts",
    label: "Contracts",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    key: "vendors",
    label: "Vendors",
    icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
  },
  {
    key: "reminders",
    label: "Reminders",
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardShell({
  vendors,
  baas,
  auditLogs,
  userName,
  userRole,
  userEmail,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contracts");
  const [selectedBAA, setSelectedBAA] = useState<BAA | null>(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [auditPacketOpen, setAuditPacketOpen] = useState(false);

  // Compute stats
  const stats = useMemo(() => {
    const totalVendors = vendors.length;
    const activeBAAs = baas.filter((b) => b.status === "active").length;
    const expiringSoon = baas.filter((b) => b.status === "expiring_soon").length;
    const expired = baas.filter(
      (b) => b.status === "expired" || b.status === "pending_signature"
    ).length;
    return { totalVendors, activeBAAs, expiringSoon, expired };
  }, [vendors, baas]);

  // Selected vendor for the detail modal
  const selectedVendor = useMemo(() => {
    if (!selectedBAA) return null;
    return vendors.find((v) => v.id === selectedBAA.vendorId) ?? null;
  }, [selectedBAA, vendors]);

  // Audit logs for the selected BAA
  const selectedAuditLogs = useMemo(() => {
    if (!selectedBAA) return [];
    return auditLogs.filter((l) => l.baaId === selectedBAA.id);
  }, [selectedBAA, auditLogs]);

  const handleSelectVendor = useCallback(
    (vendor: Vendor) => {
      const vendorBaa = baas.find((b) => b.vendorId === vendor.id);
      if (vendorBaa) {
        setSelectedBAA(vendorBaa);
      }
    },
    [baas]
  );

  const handleRefresh = useCallback(() => {
    // In production: revalidate server data via router.refresh()
    // For now this is a placeholder
    window.location.reload();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Sidebar */}
      <Sidebar
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        onNavigate={(tab) => setActiveTab(tab as Tab)}
        activeTab={activeTab}
      />

      {/* Center: Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="space-y-8 px-8 py-8">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                BAA Management Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                HIPAA Compliance &mdash; Business Associate Agreements
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAuditPacketOpen(true)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Audit Packet
              </Button>
              <Button onClick={() => setAddVendorOpen(true)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Vendor
              </Button>
            </div>
          </div>

          {/* Stats */}
          <StatsRow
            totalVendors={stats.totalVendors}
            activeBAAs={stats.activeBAAs}
            expiringSoon={stats.expiringSoon}
            expired={stats.expired}
          />

          {/* Tab bar + content */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="contracts">
              <BAATable
                baas={baas}
                vendors={vendors}
                onSelectBAA={setSelectedBAA}
              />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorList
                vendors={vendors}
                baas={baas}
                onSelectVendor={handleSelectVendor}
              />
            </TabsContent>

            <TabsContent value="reminders">
              <ReminderScheduler baas={baas} vendors={vendors} />
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <BAADetailsModal
            baa={selectedBAA}
            vendor={selectedVendor}
            auditLogs={selectedAuditLogs}
            onClose={() => setSelectedBAA(null)}
          />

          <AddVendorModal
            open={addVendorOpen}
            onClose={() => setAddVendorOpen(false)}
            onSuccess={handleRefresh}
          />

          <AuditPacketModal
            open={auditPacketOpen}
            vendors={vendors}
            baas={baas}
            onClose={() => setAuditPacketOpen(false)}
          />

          {/* Dev tools — hidden in production */}
          <DevTools />
        </div>
      </main>

      {/* Right: AI Chat Panel */}
      <aside className="hidden w-[340px] shrink-0 flex-col border-l border-border bg-card xl:flex">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <div>
            <h3
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              AI Assistant
            </h3>
            <p className="text-xs text-muted-foreground">Ask anything about your BAAs</p>
          </div>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Welcome message */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Hi! I&apos;m your HIPAA compliance assistant. I can help you with:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Review contract status
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Add or manage vendors
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Generate audit reports
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  Explain HIPAA requirements
                </li>
              </ul>
            </div>

            {/* Quick action chips */}
            <div className="flex flex-wrap gap-1.5">
              <button className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                Summarize expiring contracts
              </button>
              <button className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                What needs attention?
              </button>
              <button className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                Recent activity
              </button>
            </div>
          </div>
        </div>

        {/* Chat input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about your BAAs..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
