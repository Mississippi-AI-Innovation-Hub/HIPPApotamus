"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatsRowProps {
  totalVendors: number;
  activeBAAs: number;
  expiringSoon: number;
  expired: number;
}

interface StatCardProps {
  label: string;
  value: number;
  accentBorder: string;
  icon: ReactNode;
  indicator?: string;
}

// ─── Imports ────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, accentBorder, icon, indicator }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${accentBorder}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-[28px] font-bold tabular-nums text-slate-900">
            {value}
          </p>
          {indicator && (
            <p className="mt-1 text-xs text-slate-400">{indicator}</p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row ──────────────────────────────────────────────────────────────

export default function StatsRow({
  totalVendors,
  activeBAAs,
  expiringSoon,
  expired,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Vendors */}
      <StatCard
        label="Total Vendors"
        value={totalVendors}
        accentBorder="border-l-4 border-l-[#1D4ED8]"
        icon={
          <svg className="h-6 w-6 text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        }
        indicator="All registered vendors"
      />

      {/* Active Contracts */}
      <StatCard
        label="Active Contracts"
        value={activeBAAs}
        accentBorder="border-l-4 border-l-[#15803D]"
        icon={
          <svg className="h-6 w-6 text-[#15803D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        }
        indicator="Fully executed BAAs"
      />

      {/* Expiring Soon */}
      <StatCard
        label="Expiring Soon"
        value={expiringSoon}
        accentBorder="border-l-4 border-l-[#B45309]"
        icon={
          <svg className="h-6 w-6 text-[#B45309]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        }
        indicator="Within 90 days"
      />

      {/* Expired / Pending */}
      <StatCard
        label="Expired / Pending"
        value={expired}
        accentBorder="border-l-4 border-l-[#B91C1C]"
        icon={
          <div className="relative">
            <svg className="h-6 w-6 text-[#B91C1C]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            {expired > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B91C1C] text-[10px] font-bold text-white">
                {expired > 9 ? "!" : expired}
              </span>
            )}
          </div>
        }
        indicator="Requires attention"
      />
    </div>
  );
}
