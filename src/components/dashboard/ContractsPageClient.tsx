"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuditLog, BAA, Vendor } from "@/types";
import { Button } from "@/components/ui/button";
import BAATable from "@/components/dashboard/BAATable";
import BAADetailsModal from "@/components/dashboard/BAADetailsModal";
import AddVendorModal from "@/components/dashboard/AddVendorModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContractsPageClientProps {
  vendors: Vendor[];
  baas: BAA[];
  auditLogs: AuditLog[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContractsPageClient({
  vendors,
  baas,
  auditLogs,
}: ContractsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedBAA, setSelectedBAA] = useState<BAA | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // On mount, check if there's a baaId in the URL and auto-select that BAA
  useEffect(() => {
    const baaIdParam = searchParams.get("baaId");
    if (baaIdParam) {
      const targetBaa = baas.find((b) => b.id === baaIdParam);
      if (targetBaa) {
        setSelectedBAA(targetBaa);
      }
    }
  }, [searchParams, baas]);

  const selectedVendor = selectedBAA
    ? vendors.find((v) => v.id === selectedBAA.vendorId) ?? null
    : null;

  const selectedLogs = selectedBAA
    ? auditLogs.filter((log) => log.baaId === selectedBAA.id)
    : [];

  const handleSelectBAA = useCallback((baa: BAA) => {
    setSelectedBAA(baa);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedBAA(null);
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
            Contracts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all Business Associate Agreements
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
          Add Contract
        </Button>
      </div>

      {/* Contracts Table */}
      <BAATable
        baas={baas}
        vendors={vendors}
        onSelectBAA={handleSelectBAA}
      />

      {/* BAA Details Slide-over */}
      <BAADetailsModal
        baa={selectedBAA}
        vendor={selectedVendor}
        auditLogs={selectedLogs}
        onClose={handleCloseDetails}
      />

      {/* Add Vendor / Contract Modal */}
      <AddVendorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
