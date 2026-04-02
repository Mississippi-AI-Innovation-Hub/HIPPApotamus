"use client";

import { useState, useRef, useCallback, useEffect, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Button } from "@/components/ui/button";

interface CounterSignModalProps {
  baaId: string;
  vendorName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SIGNATURE_SCALE = 2;

export default function CounterSignModal({ baaId, vendorName, open, onClose, onSuccess }: CounterSignModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * SIGNATURE_SCALE;
    canvas.height = rect.height * SIGNATURE_SCALE;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(SIGNATURE_SCALE, SIGNATURE_SCALE);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b";
    }
  }, [open]);

  const getPosition = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getPosition(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPosition(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const handleSubmit = async () => {
    if (!hasSignature || !agreedToTerms || !signerName.trim() || !signerTitle.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);
    setError("");

    try {
      const signatureBase64 = canvas.toDataURL("image/png");
      const res = await fetch(`/api/baas/${baaId}/countersign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signatureBase64,
          counterSignerName: signerName.trim(),
          counterSignerTitle: signerTitle.trim(),
          agreedToTerms: true,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Counter-sign failed");
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const canSubmit = hasSignature && agreedToTerms && signerName.trim().length >= 2 && signerTitle.trim().length >= 3;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] z-50 mx-auto max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:w-[520px]">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Counter-Sign Agreement
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            As the covered entity representative, sign below to fully execute the BAA with <strong>{vendorName}</strong>.
          </p>
        </div>

        {/* Signer info */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Full Name *</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="James Tran"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Title *</label>
            <input
              type="text"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="HIPAA Privacy Officer"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* Signature canvas */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Signature *</label>
          <div className="relative rounded-lg border border-slate-300 bg-white">
            <canvas
              ref={canvasRef}
              className="h-32 w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Draw your signature here
              </p>
            )}
          </div>
          {hasSignature && (
            <button onClick={clearSignature} className="mt-1 text-xs text-slate-500 hover:text-slate-700">
              Clear signature
            </button>
          )}
        </div>

        {/* Consent checkbox */}
        <label className="mb-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            I, as an authorized representative of the covered entity, agree to electronically
            counter-sign this Business Associate Agreement and confirm that all terms have been
            reviewed and accepted.
          </span>
        </label>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 bg-teal-700 text-white hover:bg-teal-800"
          >
            {isSubmitting ? "Signing..." : "Counter-Sign Agreement"}
          </Button>
        </div>
      </div>
    </>
  );
}
