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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex-1 overflow-y-auto border-r border-border bg-background p-6 lg:w-3/5 lg:p-10">
        {/* Header */}
        <div className="mb-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <svg
                className="h-5 w-5 text-primary-foreground"
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
              <h1
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: "'Satoshi', sans-serif" }}
              >
                HIPAApotamus
              </h1>
              <p className="text-xs text-muted-foreground">
                HIPAA BAA Management System
              </p>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Contract content */}
        <div className="prose prose-slate max-w-none">
          <h2
            className="text-[24px] font-bold text-foreground"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            {CONTRACT_LABELS[contractType]}
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">
                Covered Entity:
              </span>
              <p className="text-foreground">{clinicName}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Business Associate:
              </span>
              <p className="text-foreground">{vendorName}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Effective Date:
              </span>
              <p className="text-foreground">{formattedEffective}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Expiration Date:
              </span>
              <p className="text-foreground">{formattedExpiration}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Term:</span>
              <p className="text-foreground">
                {termYears} year{termYears > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Template Version:
              </span>
              <p className="text-foreground">{templateVersion}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <h3 className="mt-6 text-lg font-semibold text-foreground">
            1. Definitions
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This Business Associate Agreement (&ldquo;Agreement&rdquo;) is
            entered into by and between <strong>{clinicName}</strong>{" "}
            (&ldquo;Covered Entity&rdquo;) and <strong>{vendorName}</strong>{" "}
            (&ldquo;Business Associate&rdquo;) pursuant to the Health Insurance
            Portability and Accountability Act of 1996 (&ldquo;HIPAA&rdquo;),
            the Health Information Technology for Economic and Clinical Health
            Act (&ldquo;HITECH Act&rdquo;), and their implementing regulations
            at 45 CFR Parts 160 and 164.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-foreground">
            2. Obligations of Business Associate
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Business Associate agrees to: (a) not use or disclose Protected
            Health Information (PHI) other than as permitted or required by this
            Agreement; (b) use appropriate safeguards to prevent unauthorized
            use or disclosure of PHI; (c) report to Covered Entity any use or
            disclosure not provided for by this Agreement; (d) ensure that any
            subcontractors that create, receive, maintain, or transmit PHI agree
            to the same restrictions and conditions.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-foreground">
            3. Permitted Uses and Disclosures
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Business Associate may use or disclose PHI solely to perform
            services as specified in the underlying service agreement, and as
            required by law. Business Associate may use PHI for its proper
            management and administration or to carry out its legal
            responsibilities.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-foreground">
            4. Breach Notification
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Business Associate shall report to Covered Entity any Breach of
            Unsecured PHI without unreasonable delay and in no case later than
            the timeline specified in the service agreement. The notification
            shall include the identification of each individual whose PHI has
            been, or is reasonably believed to have been, accessed, acquired,
            used, or disclosed during the Breach.
          </p>

          {requiresStateLawRetentionNotice && (
            <>
              <h3 className="mt-6 text-lg font-semibold text-foreground">
                5. Mississippi State Law Compliance
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                In addition to federal HIPAA requirements, Business Associate
                acknowledges that Mississippi state law requires a minimum 10-year
                retention period for medical records. Business Associate shall
                maintain all PHI in accordance with this requirement and shall not
                destroy any medical records prior to the expiration of this
                retention period.
              </p>
            </>
          )}

          <h3 className="mt-6 text-lg font-semibold text-foreground">
            {requiresStateLawRetentionNotice ? "6" : "5"}. Term and Termination
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This Agreement shall be effective as of {formattedEffective} and
            shall terminate on {formattedExpiration}, or when all PHI provided
            by Covered Entity to Business Associate is destroyed or returned to
            Covered Entity, whichever is later.
          </p>
        </div>
      </div>

      {/* Right panel — Chat + Signature (40%) */}
      <div className="flex flex-col bg-muted/30 lg:w-2/5">
        {/* Vendor AI Chat */}
        <Card className="flex-1 rounded-none border-0 shadow-none ring-0 border-b border-border">
          <CardHeader className="px-4 pb-0">
            <h3
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Questions about this agreement?
            </h3>
          </CardHeader>
          <CardContent className="px-4">
            <ChatPanel
              context="vendor"
              contextId={vendorId}
              placeholder="Ask about this agreement..."
              className="h-[280px]"
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Signature area */}
        <Card className="rounded-none border-0 shadow-none ring-0">
          <CardContent className="px-4 py-4">
            {submitResult?.success ? (
              <div className="rounded-xl bg-primary/10 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <svg
                    className="h-6 w-6 text-primary"
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
                <p className="font-medium text-primary">
                  {submitResult.message}
                </p>
              </div>
            ) : (
              <>
                <h3
                  className="mb-3 text-base font-semibold text-foreground"
                  style={{ fontFamily: "'Satoshi', sans-serif" }}
                >
                  Sign below
                </h3>

                {/* Canvas */}
                <div className="relative rounded-lg border border-border bg-background">
                  <canvas
                    ref={canvasRef}
                    className="h-40 w-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSignature && (
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                      Draw your signature here
                    </p>
                  )}
                </div>

                {hasSignature && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={clearSignature}
                    className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear signature
                  </Button>
                )}

                <Separator className="my-4" />

                {/* Agreement checkbox */}
                <label className="mt-4 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    I have read and agree to the terms of this Business Associate
                    Agreement. I am authorized to sign on behalf of{" "}
                    <strong className="text-foreground">{vendorName}</strong>.
                  </span>
                </label>

                {/* Error */}
                {submitResult && !submitResult.success && (
                  <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
                    {submitResult.message}
                  </div>
                )}

                {/* Sign button */}
                <Button
                  onClick={handleSign}
                  disabled={!hasSignature || !agreedToTerms || isSubmitting}
                  size="lg"
                  className="mt-4 w-full h-11 text-[16px] font-semibold"
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
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
