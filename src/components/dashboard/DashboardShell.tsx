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
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        onNavigate={(tab) => setActiveTab(tab as Tab)}
        activeTab={activeTab}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            BAA Management Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mississippi Department of Health &mdash; HIPAA Compliance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAuditPacketOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Audit Packet
          </button>
          <button
            type="button"
            onClick={() => setAddVendorOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0D6560]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Vendor
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow
        totalVendors={stats.totalVendors}
        activeBAAs={stats.activeBAAs}
        expiringSoon={stats.expiringSoon}
        expired={stats.expired}
      />

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Dashboard tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-[#0F766E] text-[#0F766E]"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "contracts" && (
          <BAATable
            baas={baas}
            vendors={vendors}
            onSelectBAA={setSelectedBAA}
          />
        )}

        {activeTab === "vendors" && (
          <VendorList
            vendors={vendors}
            baas={baas}
            onSelectVendor={handleSelectVendor}
          />
        )}

        {activeTab === "reminders" && (
          <ReminderScheduler baas={baas} vendors={vendors} />
        )}
      </div>

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
    </div>
  );
}
