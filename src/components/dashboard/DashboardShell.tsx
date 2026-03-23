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
  const [copilotOpen, setCopilotOpen] = useState(false);

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
      <main className="flex-1 overflow-y-auto dot-pattern">
        <div className="space-y-8 px-8 py-8">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className="text-[28px] font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                BAA Management Dashboard
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
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
              <Button onClick={() => setAddVendorOpen(true)} className="bg-[#0F766E] text-white hover:bg-[#0D6560]">
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

      {/* Copilot edge tab — a vertical pill docked to the right edge */}
      <div
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 transition-all duration-300 ${
          copilotOpen ? "pointer-events-none opacity-0 translate-x-4" : "opacity-100 translate-x-0"
        }`}
      >
        <button
          onClick={() => setCopilotOpen(true)}
          className="group flex flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-border bg-card px-2 py-5 shadow-premium transition-all duration-200 hover:px-3 hover:shadow-premium-hover"
          title="Open HIPAA Copilot"
        >
          {/* Sparkle icon */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)" }}
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          {/* Vertical text */}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-[#0F766E]"
            style={{ writingMode: "vertical-lr" }}
          >
            AI Copilot
          </span>
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </button>
      </div>

      {/* Right: AI Compliance Agent Panel — collapsible */}
      <aside
        className={`flex shrink-0 flex-col border-l border-border bg-card transition-all duration-300 ease-in-out ${
          copilotOpen ? "w-[380px]" : "w-0 overflow-hidden border-l-0"
        }`}
      >
        {/* Hero header — makes it immediately clear what this is */}
        <div
          className="relative overflow-hidden border-b border-border px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #134E48 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)" }}
              >
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  HIPAA Copilot
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-xs font-medium text-emerald-300">Ready</p>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => setCopilotOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Close HIPAA Copilot"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Your AI-powered compliance assistant. Ask questions, run actions, or get insights — all from here.
            </p>
          </div>
        </div>

        {/* Capability cards — visually distinct, scannable */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">What I can do</p>
          <div className="space-y-2.5 animate-fade-in-up">
            {[
              { icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z", title: "Contract Status", desc: "Check any BAA's status, expiration, or audit history" },
              { icon: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z", title: "Vendor Management", desc: "Add vendors, send reminders, or manage contracts" },
              { icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z", title: "Audit Reports", desc: "Generate compliance reports and audit packets instantly" },
              { icon: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25", title: "HIPAA Guidance", desc: "Ask about regulations, 45 CFR, breach protocols" },
            ].map((item, i) => (
              <button
                key={item.title}
                className={`flex w-full items-start gap-3 rounded-xl border border-border/50 bg-background p-3.5 text-left transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Quick prompts */}
          <p className="mt-5 mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {["Which BAAs expire this month?", "Summarize all contracts", "What needs my attention?"].map((prompt) => (
              <button
                key={prompt}
                className="rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Chat input */}
        <div className="border-t border-border p-5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask HIPAA Copilot anything..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-150 hover:opacity-90 hover:shadow-md active:scale-95"
              style={{ background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)" }}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
