"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";

interface UploadBAAModalProps {
  baaId: string;
  vendorName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadBAAModal({
  baaId,
  vendorName,
  open,
  onClose,
  onSuccess,
}: UploadBAAModalProps) {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [legalReviewedBy, setLegalReviewedBy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      addToast("Only PDF files are accepted", "error");
    }
  }, [addToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        addToast("Only PDF files are accepted", "error");
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file || !legalReviewedBy.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("legalReviewedBy", legalReviewedBy.trim());

      const res = await fetch(`/api/baas/${baaId}/upload`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      addToast("Vendor-supplied BAA uploaded successfully", "success");
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      addToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setLegalReviewedBy("");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload vendor-supplied BAA"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Upload Vendor-Supplied BAA
              </h2>
              <p className="text-sm text-muted-foreground">{vendorName}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Warning Banner */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex gap-3">
                <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Exception Flow</p>
                  <p className="mt-1">
                    This is for vendors who insist on using their own BAA paper
                    (e.g., AWS, Google, Microsoft, Epic). Uploaded BAAs are flagged
                    as &ldquo;vendor-supplied&rdquo; in audit packets and require
                    legal review attestation.
                  </p>
                </div>
              </div>
            </div>

            {/* File Drop Zone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                BAA Document (PDF)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                  dragActive
                    ? "border-[#0F766E] bg-[#0F766E]/5"
                    : file
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-border hover:border-[#0F766E]/40 hover:bg-muted/50"
                }`}
              >
                {file ? (
                  <>
                    <svg className="mb-2 h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                    <p className="mt-1 text-xs text-emerald-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <svg className="mb-2 h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm font-medium text-foreground">
                      Drop PDF here or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF only, max 25 MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Legal Reviewer */}
            <div>
              <label
                htmlFor="legalReviewedBy"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Legal Reviewer Name <span className="text-red-500">*</span>
              </label>
              <input
                id="legalReviewedBy"
                type="text"
                value={legalReviewedBy}
                onChange={(e) => setLegalReviewedBy(e.target.value)}
                placeholder="e.g., Jane Smith, Office of General Counsel"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Name of the attorney or compliance officer who reviewed this
                vendor-supplied BAA for HIPAA adequacy.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !legalReviewedBy.trim() || uploading}
              className="bg-[#0F766E] text-white hover:bg-[#0D6560] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Upload BAA"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
