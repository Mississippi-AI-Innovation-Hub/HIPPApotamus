"use client";

import { useMemo } from "react";
import type { ComplianceMatrix as ComplianceMatrixType } from "@/types";

interface ComplianceMatrixProps {
  matrix: ComplianceMatrixType;
}

export default function ComplianceMatrix({ matrix }: ComplianceMatrixProps) {
  const { federalRows, msdhRows, federalSatisfied, msdhSatisfied } = useMemo(() => {
    const federal = matrix.rows.filter((r) => r.cfrCitation.startsWith("164.504"));
    const msdh = matrix.rows.filter((r) => r.cfrCitation.startsWith("MSDH."));
    return {
      federalRows: federal,
      msdhRows: msdh,
      federalSatisfied: federal.filter((r) => r.satisfied).length,
      msdhSatisfied: msdh.filter((r) => r.satisfied).length,
    };
  }, [matrix]);

  const totalSatisfied = federalSatisfied + msdhSatisfied;
  const totalRows = matrix.rows.length;
  const pct = totalRows > 0 ? Math.round((totalSatisfied / totalRows) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#0F766E]/20">
          <span className="text-lg font-bold text-[#0F766E]">{pct}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {totalSatisfied} of {totalRows} requirements satisfied
          </p>
          <p className="text-xs text-muted-foreground">
            Template version {matrix.templateVersion} &middot; Generated{" "}
            {new Date(matrix.generatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Federal Requirements */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Federal Requirements — 45 CFR 164.504(e)(2)
          <span className="ml-2 text-[#0F766E]">
            ({federalSatisfied}/{federalRows.length})
          </span>
        </h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-8" />
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Citation</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Requirement</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">MSDH Section</th>
              </tr>
            </thead>
            <tbody>
              {federalRows.map((row) => (
                <tr key={row.cfrCitation} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-center">
                    {row.satisfied ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {row.cfrCitation}
                  </td>
                  <td className="px-3 py-2 text-foreground">{row.cfrRequirement}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{row.msdhSection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MSDH-Specific Provisions */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          MSDH-Specific Provisions (Beyond Federal Minimum)
          <span className="ml-2 text-[#0F766E]">
            ({msdhSatisfied}/{msdhRows.length})
          </span>
        </h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-8" />
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Provision</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Requirement</th>
                <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">MSDH Section</th>
              </tr>
            </thead>
            <tbody>
              {msdhRows.map((row) => (
                <tr key={row.cfrCitation} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-center">
                    {row.satisfied ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {row.cfrCitation.replace("MSDH.", "")}
                  </td>
                  <td className="px-3 py-2 text-foreground">{row.cfrRequirement}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{row.msdhSection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
