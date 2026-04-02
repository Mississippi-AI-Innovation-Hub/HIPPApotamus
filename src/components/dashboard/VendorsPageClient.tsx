"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditLog, BAA, Vendor } from "@/types";
import { Button } from "@/components/ui/button";
import VendorList from "@/components/dashboard/VendorList";
import BAADetailsModal from "@/components/dashboard/BAADetailsModal";
import AddVendorModal from "@/components/dashboard/AddVendorModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VendorsPageClientProps {
  vendors: Vendor[];
  baas: BAA[];
  auditLogs: AuditLog[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VendorsPageClient({
  vendors,
  baas,
  auditLogs,
}: VendorsPageClientProps) {
  const router = useRouter();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Find the most relevant BAA for the selected vendor
  const selectedBAA = selectedVendor
    ? (() => {
        const vendorBaas = baas.filter(
          (b) => b.vendorId === selectedVendor.id
        );
        const priority: string[] = [
          "pending_countersignature",
          "active",
          "expiring_soon",
          "pending_signature",
          "expired",
          "terminated",
          "declined",
        ];
        const sorted = [...vendorBaas].sort(
          (a, b) => {
            const ai = priority.indexOf(a.status);
            const bi = priority.indexOf(b.status);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          }
        );
        return sorted[0] ?? null;
      })()
    : null;

  const selectedLogs = selectedBAA
    ? auditLogs.filter((log) => log.baaId === selectedBAA.id)
    : [];

  const handleSelectVendor = useCallback((vendor: Vendor) => {
    setSelectedVendor(vendor);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedVendor(null);
  }, []);

  const handleAddSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Vendors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage healthcare vendor relationships
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#0F766E] text-white hover:bg-[#0D6560]"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Vendor
        </Button>
      </div>

      {/* Vendor Grid */}
      <VendorList
        vendors={vendors}
        baas={baas}
        onSelectVendor={handleSelectVendor}
      />

      {/* BAA Details Slide-over (shown when a vendor is selected) */}
      <BAADetailsModal
        baa={selectedBAA}
        vendor={selectedVendor}
        auditLogs={selectedLogs}
        onClose={handleCloseDetails}
      />

      {/* Add Vendor Modal */}
      <AddVendorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
