"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import type { ContractType } from "@/types";

// ─── Props ───────────────────────────────────────────────────────────────────

interface SigningInterfaceProps {
  baaId: string;
  vendorId: string;
  vendorName: string;
  clinicName: string;
  contractType: ContractType;
  effectiveDate: string;
  expirationDate: string;
  templateVersion: string;
  termYears: 1 | 2;
  requiresStateLawRetentionNotice: boolean;
}

// ─── Contract type display names ─────────────────────────────────────────────

const CONTRACT_LABELS: Record<ContractType, string> = {
  baa_ehr_platform_services: "BAA - EHR Platform Services",
  baa_reference_laboratory_services: "BAA - Reference Laboratory Services",
  baa_telehealth_remote_monitoring_services:
    "BAA - Telehealth & Remote Monitoring Services",
  baa_eprescribing_pmp_integration_services:
    "BAA - E-Prescribing & PMP Integration Services",
  baa_medical_records_storage_roi_services:
    "BAA - Medical Records Storage & ROI Services",
  other: "BAA - General Business Associate Agreement",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function SigningInterface({
  baaId,
  vendorId,
  vendorName,
  clinicName,
  contractType,
  effectiveDate,
  expirationDate,
  templateVersion,
  termYears,
  requiresStateLawRetentionNotice,
}: SigningInterfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas internal dimensions to match display
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Drawing style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCanvasCoords = useCallback(
    (
      e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
    ): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }

      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const startDrawing = useCallback(
    (
      e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
    ) => {
      const coords = getCanvasCoords(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    },
    [getCanvasCoords],
  );

  const draw = useCallback(
    (
      e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>,
    ) => {
      if (!isDrawing) return;

      const coords = getCanvasCoords(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getCanvasCoords],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const handleSign = useCallback(async () => {
    if (!hasSignature || !agreedToTerms) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const signatureBase64 = canvas.toDataURL("image/png");

      const response = await fetch(`/api/baas/${baaId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signatureBase64,
          vendorId,
        }),
      });

      if (response.ok) {
        setSubmitResult({
          success: true,
          message:
            "Agreement signed successfully. You will receive a confirmation email shortly.",
        });
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSubmitResult({
          success: false,
          message: errorData.error ?? "Failed to submit signature. Please try again.",
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [hasSignature, agreedToTerms, baaId, vendorId]);

  const formattedEffective = new Date(effectiveDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const formattedExpiration = new Date(expirationDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — Contract document (60%) */}
      <div className="flex-1 overflow-y-auto border-r border-slate-200 bg-white p-6 lg:w-3/5 lg:p-10">
        {/* Header */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F766E]">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl text-slate-900" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
                HIPAApotamus
              </h1>
              <p className="text-xs text-slate-500">
                HIPAA BAA Management System
              </p>
            </div>
          </div>
        </div>

        {/* Contract content */}
        <div className="prose prose-slate max-w-none">
          <h2 className="text-xl font-bold text-slate-900">
            {CONTRACT_LABELS[contractType]}
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
            <div>
              <span className="font-medium text-slate-600">
                Covered Entity:
              </span>
              <p className="text-slate-900">{clinicName}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">
                Business Associate:
              </span>
              <p className="text-slate-900">{vendorName}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">
                Effective Date:
              </span>
              <p className="text-slate-900">{formattedEffective}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">
                Expiration Date:
              </span>
              <p className="text-slate-900">{formattedExpiration}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Term:</span>
              <p className="text-slate-900">
                {termYears} year{termYears > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-600">
                Template Version:
              </span>
              <p className="text-slate-900">{templateVersion}</p>
            </div>
          </div>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            1. Definitions
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">
            This Business Associate Agreement (&ldquo;Agreement&rdquo;) is
            entered into by and between <strong>{clinicName}</strong>{" "}
            (&ldquo;Covered Entity&rdquo;) and <strong>{vendorName}</strong>{" "}
            (&ldquo;Business Associate&rdquo;) pursuant to the Health Insurance
            Portability and Accountability Act of 1996 (&ldquo;HIPAA&rdquo;),
            the Health Information Technology for Economic and Clinical Health
            Act (&ldquo;HITECH Act&rdquo;), and their implementing regulations
            at 45 CFR Parts 160 and 164.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            2. Obligations of Business Associate
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">
            Business Associate agrees to: (a) not use or disclose Protected
            Health Information (PHI) other than as permitted or required by this
            Agreement; (b) use appropriate safeguards to prevent unauthorized
            use or disclosure of PHI; (c) report to Covered Entity any use or
            disclosure not provided for by this Agreement; (d) ensure that any
            subcontractors that create, receive, maintain, or transmit PHI agree
            to the same restrictions and conditions.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            3. Permitted Uses and Disclosures
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">
            Business Associate may use or disclose PHI solely to perform
            services as specified in the underlying service agreement, and as
            required by law. Business Associate may use PHI for its proper
            management and administration or to carry out its legal
            responsibilities.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            4. Breach Notification
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">
            Business Associate shall report to Covered Entity any Breach of
            Unsecured PHI without unreasonable delay and in no case later than
            the timeline specified in the service agreement. The notification
            shall include the identification of each individual whose PHI has
            been, or is reasonably believed to have been, accessed, acquired,
            used, or disclosed during the Breach.
          </p>

          {requiresStateLawRetentionNotice && (
            <>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">
                5. Mississippi State Law Compliance
              </h3>
              <p className="text-sm leading-relaxed text-slate-700">
                In addition to federal HIPAA requirements, Business Associate
                acknowledges that Mississippi state law requires a minimum 10-year
                retention period for medical records. Business Associate shall
                maintain all PHI in accordance with this requirement and shall not
                destroy any medical records prior to the expiration of this
                retention period.
              </p>
            </>
          )}

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            {requiresStateLawRetentionNotice ? "6" : "5"}. Term and Termination
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">
            This Agreement shall be effective as of {formattedEffective} and
            shall terminate on {formattedExpiration}, or when all PHI provided
            by Covered Entity to Business Associate is destroyed or returned to
            Covered Entity, whichever is later.
          </p>
        </div>
      </div>

      {/* Right panel — Chat + Signature (40%) */}
      <div className="flex flex-col bg-slate-50 lg:w-2/5">
        {/* Vendor AI Chat */}
        <div className="flex-1 border-b border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Questions about this agreement?
          </h3>
          <ChatPanel
            context="vendor"
            contextId={vendorId}
            placeholder="Ask about this agreement..."
            className="h-[280px]"
          />
        </div>

        {/* Signature area */}
        <div className="p-4">
          {submitResult?.success ? (
            <div className="rounded-xl bg-[#CCFBF1] p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#CCFBF1]">
                <svg
                  className="h-6 w-6 text-[#0F766E]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="font-medium text-[#0F766E]">
                {submitResult.message}
              </p>
            </div>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Sign below
              </h3>

              {/* Canvas */}
              <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white">
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
                <button
                  onClick={clearSignature}
                  className="mt-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear signature
                </button>
              )}

              {/* Agreement checkbox */}
              <label className="mt-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]/20"
                />
                <span className="text-xs leading-relaxed text-slate-600">
                  I have read and agree to the terms of this Business Associate
                  Agreement. I am authorized to sign on behalf of{" "}
                  <strong>{vendorName}</strong>.
                </span>
              </label>

              {/* Error */}
              {submitResult && !submitResult.success && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {submitResult.message}
                </div>
              )}

              {/* Sign button */}
              <button
                onClick={handleSign}
                disabled={!hasSignature || !agreedToTerms || isSubmitting}
                className="mt-4 w-full rounded-lg bg-[#0F766E] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0D6560] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing...
                  </span>
                ) : (
                  "Sign Agreement"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
