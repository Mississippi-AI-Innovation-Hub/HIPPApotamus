"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface PDFPreviewModalProps {
  baaId: string | null;
  vendorName: string;
  /** If the BAA has a stored signed PDF, pass the S3 key to serve it directly. */
  signedDocumentUrl?: string | null;
  onClose: () => void;
}

export default function PDFPreviewModal({ baaId, vendorName, signedDocumentUrl, onClose }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!baaId) return;
    setLoading(true);
    setError(false);
    setPdfUrl(null);

    const apiUrl = signedDocumentUrl
      ? `/api/pdf/${baaId}?stored=true`
      : `/api/pdf/${baaId}`;

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) {
          // Check if it's a tamper alert
          if (res.status === 409) {
            return res.json().then((data: { error?: string }) => {
              throw new Error(data.error ?? "Document integrity check failed");
            });
          }
          throw new Error("Failed to load PDF");
        }
        // Log whether we got the stored version or regenerated
        const integrityVerified = res.headers.get("X-Integrity-Verified");
        if (integrityVerified === "true") {
          console.log("Serving stored signed PDF — integrity verified");
        }
        return res.blob();
      })
      .then((blob) => {
        if (blob instanceof Blob) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baaId, signedDocumentUrl]);

  const handleDownload = useCallback(() => {
    if (!pdfUrl || !baaId) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `BAA-${baaId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfUrl, baaId]);

  if (!baaId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-card shadow-2xl sm:inset-8 lg:inset-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              BAA Contract Preview
            </h2>
            <p className="text-sm text-muted-foreground">
              {vendorName} — {baaId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!pdfUrl}
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </Button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 bg-slate-100">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <svg className="h-8 w-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-muted-foreground">
                {signedDocumentUrl ? "Loading signed document..." : "Generating PDF..."}
              </p>
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Failed to generate PDF</p>
              <p className="text-xs text-muted-foreground">The PDF service may not be available. Try downloading instead.</p>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="h-full w-full border-0"
              title={`BAA Contract - ${vendorName}`}
            />
          )}
        </div>
      </div>
    </>
  );
}
