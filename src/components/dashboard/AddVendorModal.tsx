"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContractType, VendorType } from "@/types";
import { useToast } from "@/components/ui/Toast";

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
  const [isClosing, setIsClosing] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setVendor(INITIAL_VENDOR);
      setContract(INITIAL_CONTRACT);
      setSubmitting(false);
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

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
        body: JSON.stringify({ vendor, contract }),
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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add new vendor"
          className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Add New Vendor</h2>
              <p className="text-sm text-slate-500">
                Step {step} of 2 &mdash;{" "}
                {step === 1 ? "Vendor Information" : "Contract Setup"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close dialog"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 px-6 pt-4">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-teal-500" : "bg-slate-200"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-teal-500" : "bg-slate-200"}`} />
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {step === 1 ? (
              <div className="space-y-4">
                <FormField
                  label="Vendor Name"
                  required
                >
                  <input
                    type="text"
                    value={vendor.name}
                    onChange={(e) => setVendor({ ...vendor, name: e.target.value })}
                    placeholder="e.g. CernerHealth Systems"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </FormField>

                <FormField label="Vendor Type" required>
                  <select
                    value={vendor.type}
                    onChange={(e) => setVendor({ ...vendor, type: e.target.value as VendorType })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
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
                    <input
                      type="text"
                      value={vendor.contactName}
                      onChange={(e) => setVendor({ ...vendor, contactName: e.target.value })}
                      placeholder="Jane Smith"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </FormField>

                  <FormField label="Email" required>
                    <input
                      type="email"
                      value={vendor.contactEmail}
                      onChange={(e) => setVendor({ ...vendor, contactEmail: e.target.value })}
                      placeholder="jane@vendor.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Phone">
                    <input
                      type="tel"
                      value={vendor.contactPhone}
                      onChange={(e) => setVendor({ ...vendor, contactPhone: e.target.value })}
                      placeholder="(601) 555-0123"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </FormField>

                  <FormField label="Address">
                    <input
                      type="text"
                      value={vendor.address}
                      onChange={(e) => setVendor({ ...vendor, address: e.target.value })}
                      placeholder="123 Health St, Jackson MS"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  >
                    {CONTRACT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Template Version">
                  <input
                    type="text"
                    value={contract.templateVersion}
                    onChange={(e) =>
                      setContract({ ...contract, templateVersion: e.target.value })
                    }
                    placeholder="v2.1.0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Effective Date" required>
                    <input
                      type="date"
                      value={contract.effectiveDate}
                      onChange={(e) =>
                        setContract({ ...contract, effectiveDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </FormField>

                  <FormField label="Expiration Date" required>
                    <input
                      type="date"
                      value={contract.expirationDate}
                      onChange={(e) =>
                        setContract({ ...contract, expirationDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </FormField>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  <strong>Note:</strong> Once submitted, the vendor will receive an
                  email invitation to create their account and complete the BAA
                  signing process.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleStep1Next}
                className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
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
              </button>
            )}
          </div>
        </div>
      </div>
    </>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
