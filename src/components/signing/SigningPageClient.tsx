"use client";

import { useState } from "react";
import OTPGate from "./OTPGate";
import SigningInterface from "./SigningInterface";
import type { ContractType } from "@/types";

interface SigningPageClientProps {
  baaId: string;
  token: string;
  vendorId: string;
  vendorName: string;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  authorizedSignerEmail: string;
  clinicName: string;
  contractType: ContractType;
  effectiveDate: string;
  expirationDate: string;
  templateVersion: string;
  termYears: 1 | 2;
  requiresStateLawRetentionNotice: boolean;
}

export default function SigningPageClient(props: SigningPageClientProps) {
  const [isVerified, setIsVerified] = useState(false);

  if (!isVerified) {
    return (
      <OTPGate
        baaId={props.baaId}
        token={props.token}
        vendorName={props.vendorName}
        onVerified={() => setIsVerified(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SigningInterface
        baaId={props.baaId}
        vendorId={props.vendorId}
        vendorName={props.vendorName}
        authorizedSignerName={props.authorizedSignerName}
        authorizedSignerTitle={props.authorizedSignerTitle}
        authorizedSignerEmail={props.authorizedSignerEmail}
        clinicName={props.clinicName}
        contractType={props.contractType}
        effectiveDate={props.effectiveDate}
        expirationDate={props.expirationDate}
        templateVersion={props.templateVersion}
        termYears={props.termYears}
        requiresStateLawRetentionNotice={props.requiresStateLawRetentionNotice}
      />
    </div>
  );
}
