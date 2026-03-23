"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContractType, VendorType } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AddVendorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VendorFormData {
  name: string;
  type: VendorType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface ContractFormData {
  templateVersion: string;
  effectiveDate: string;
  expirationDate: string;
  contractType: ContractType;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: "ehr_platform", label: "EHR Platform" },
  { value: "reference_laboratory", label: "Reference Laboratory" },
  { value: "telehealth_platform", label: "Telehealth Platform" },
  { value: "eprescribing_pmp", label: "e-Prescribing / PMP Integration" },
  { value: "medical_records_storage", label: "Medical Records Storage" },
  { value: "other", label: "Other" },
];

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "baa_ehr_platform_services", label: "BAA - EHR Platform Services" },
  { value: "baa_reference_laboratory_services", label: "BAA - Reference Laboratory Services" },
  { value: "baa_telehealth_remote_monitoring_services", label: "BAA - Telehealth / Remote Monitoring" },
  { value: "baa_eprescribing_pmp_integration_services", label: "BAA - e-Prescribing / PMP Integration" },
  { value: "baa_medical_records_storage_roi_services", label: "BAA - Medical Records Storage / ROI" },
  { value: "other", label: "Other" },
];

const INITIAL_VENDOR: VendorFormData = {
  name: "",
  type: "ehr_platform",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
};

const INITIAL_CONTRACT: ContractFormData = {
  templateVersion: "v2.1.0",
  effectiveDate: "",
  expirationDate: "",
  contractType: "baa_ehr_platform_services",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AddVendorModal({ open, onClose, onSuccess }: AddVendorModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [vendor, setVendor] = useState<VendorFormData>(INITIAL_VENDOR);
  const [contract, setContract] = useState<ContractFormData>(INITIAL_CONTRACT);
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setVendor(INITIAL_VENDOR);
      setContract(INITIAL_CONTRACT);
      setSubmitting(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleStep1Next = () => {
    // Validate step 1
    if (!vendor.name.trim()) {
      addToast("Vendor name is required", "error");
      return;
    }
    if (!vendor.contactEmail.trim()) {
      addToast("Contact email is required", "error");
      return;
    }
    if (!vendor.contactName.trim()) {
      addToast("Contact name is required", "error");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    // Validate step 2
    if (!contract.effectiveDate) {
      addToast("Effective date is required", "error");
      return;
    }
    if (!contract.expirationDate) {
      addToast("Expiration date is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendor.name,
          type: vendor.type,
          contactName: vendor.contactName,
          contactEmail: vendor.contactEmail,
          contactPhone: vendor.contactPhone,
          address: vendor.address,
          contractType: contract.contractType,
          effectiveDate: contract.effectiveDate,
          expirationDate: contract.expirationDate,
          templateVersion: contract.templateVersion,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      addToast(`${vendor.name} added successfully`, "success");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      addToast(`Failed to add vendor: ${message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold">Add New Vendor</DialogTitle>
          <DialogDescription>
            Step {step} of 2 &mdash;{" "}
            {step === 1 ? "Vendor Information" : "Contract Setup"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-2 px-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
        </div>

        <Separator />

        {/* Body */}
        <div className="px-6 py-2">
          {step === 1 ? (
            <div className="space-y-4">
              <FormField label="Vendor Name" required>
                <Input
                  type="text"
                  value={vendor.name}
                  onChange={(e) => setVendor({ ...vendor, name: e.target.value })}
                  placeholder="e.g. CernerHealth Systems"
                />
              </FormField>

              <FormField label="Vendor Type" required>
                <select
                  value={vendor.type}
                  onChange={(e) => setVendor({ ...vendor, type: e.target.value as VendorType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary"
                >
                  {VENDOR_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Contact Name" required>
                  <Input
                    type="text"
                    value={vendor.contactName}
                    onChange={(e) => setVendor({ ...vendor, contactName: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </FormField>

                <FormField label="Email" required>
                  <Input
                    type="email"
                    value={vendor.contactEmail}
                    onChange={(e) => setVendor({ ...vendor, contactEmail: e.target.value })}
                    placeholder="jane@vendor.com"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone">
                  <Input
                    type="tel"
                    value={vendor.contactPhone}
                    onChange={(e) => setVendor({ ...vendor, contactPhone: e.target.value })}
                    placeholder="(601) 555-0123"
                  />
                </FormField>

                <FormField label="Address">
                  <Input
                    type="text"
                    value={vendor.address}
                    onChange={(e) => setVendor({ ...vendor, address: e.target.value })}
                    placeholder="123 Health St, Jackson MS"
                  />
                </FormField>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField label="Contract Type" required>
                <select
                  value={contract.contractType}
                  onChange={(e) =>
                    setContract({ ...contract, contractType: e.target.value as ContractType })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary"
                >
                  {CONTRACT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Template Version">
                <Input
                  type="text"
                  value={contract.templateVersion}
                  onChange={(e) =>
                    setContract({ ...contract, templateVersion: e.target.value })
                  }
                  placeholder="v2.1.0"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Effective Date" required>
                  <Input
                    type="date"
                    value={contract.effectiveDate}
                    onChange={(e) =>
                      setContract({ ...contract, effectiveDate: e.target.value })
                    }
                  />
                </FormField>

                <FormField label="Expiration Date" required>
                  <Input
                    type="date"
                    value={contract.expirationDate}
                    onChange={(e) =>
                      setContract({ ...contract, expirationDate: e.target.value })
                    }
                  />
                </FormField>
              </div>

              <div className="rounded-lg border border-info/20 bg-info-light px-4 py-3 text-xs text-info">
                <strong>Note:</strong> Once submitted, the vendor will receive an
                email invitation to create their account and complete the BAA
                signing process.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t border-border px-6 py-4">
          {step === 2 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 1 ? (
            <Button onClick={handleStep1Next}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {submitting ? "Submitting..." : "Add Vendor"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Field ─────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
