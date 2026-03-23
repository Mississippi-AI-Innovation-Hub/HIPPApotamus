import { getBAAById, getVendorById, getClinic } from "@/lib/db";
import { logger } from "@/lib/logger";
import SigningInterface from "@/components/signing/SigningInterface";

interface SignPageProps {
  params: Promise<{ baaId: string }>;
}

export default async function SignPage({ params }: SignPageProps) {
  const { baaId } = await params;

  try {
    const baa = await getBAAById(baaId);

    // BAA not found
    if (!baa) {
      logger.warn("Sign page: BAA not found", { baaId });
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-7 w-7 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Contract Not Found
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              The Business Associate Agreement you are looking for does not exist
              or has been removed.
            </p>
          </div>
        </div>
      );
    }

    // Already signed
    if (baa.signedDate) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#CCFBF1]">
              <svg
                className="h-7 w-7 text-[#0F766E]"
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
            <h1 className="text-xl font-bold text-slate-900">
              Already Signed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This Business Associate Agreement was signed on{" "}
              <strong>
                {new Date(baa.signedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>{" "}
              by <strong>{baa.signedBy}</strong>.
            </p>
          </div>
        </div>
      );
    }

    // Expired
    const now = new Date();
    const expirationDate = new Date(baa.expirationDate);
    if (expirationDate < now) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-7 w-7 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Contract Expired
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This Business Associate Agreement expired on{" "}
              <strong>
                {expirationDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
              . Please contact the HIPAA officer for a renewed agreement.
            </p>
          </div>
        </div>
      );
    }

    // Fetch vendor and clinic for the signing interface
    const vendor = await getVendorById(baa.vendorId);
    const clinic = await getClinic(baa.clinicId);

    return (
      <div className="min-h-screen bg-slate-50">
        <SigningInterface
          baaId={baa.id}
          vendorId={baa.vendorId}
          vendorName={vendor?.name ?? "Vendor"}
          clinicName={clinic?.name ?? "Mississippi DOH Clinic"}
          contractType={baa.contractType}
          effectiveDate={baa.effectiveDate}
          expirationDate={baa.expirationDate}
          templateVersion={baa.templateVersion}
          termYears={baa.termYears}
          requiresStateLawRetentionNotice={baa.requiresStateLawRetentionNotice}
        />
      </div>
    );
  } catch (error) {
    logger.error("Sign page error", { baaId, error: String(error) });
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We were unable to load this agreement. Please try again later or
            contact support.
          </p>
        </div>
      </div>
    );
  }
}
