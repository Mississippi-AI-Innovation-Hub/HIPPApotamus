"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatusChartProps {
  active: number;
  expiringSoon: number;
  expired: number;
  pending: number;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { key: "active", label: "Active", color: "#15803D" },
  { key: "expiringSoon", label: "Expiring Soon", color: "#CA8A04" },
  { key: "expired", label: "Expired", color: "#DC2626" },
  { key: "pending", label: "Pending Signature", color: "#1D4ED8" },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export default function StatusChart({
  active,
  expiringSoon,
  expired,
  pending,
}: StatusChartProps) {
  const counts: Record<string, number> = {
    active,
    expiringSoon,
    expired,
    pending,
  };

  const total = active + expiringSoon + expired + pending;

  // Build conic-gradient stops
  let gradient = "conic-gradient(";
  let cumulativeDeg = 0;

  if (total === 0) {
    gradient = "conic-gradient(#e2e8f0 0deg 360deg)";
  } else {
    const stops: string[] = [];
    for (const seg of SEGMENTS) {
      const count = counts[seg.key];
      const degrees = (count / total) * 360;
      stops.push(`${seg.color} ${cumulativeDeg}deg ${cumulativeDeg + degrees}deg`);
      cumulativeDeg += degrees;
    }
    gradient = `conic-gradient(${stops.join(", ")})`;
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut ring */}
      <div className="relative">
        <div
          className="h-44 w-44 rounded-full"
          style={{ background: gradient }}
        />
        {/* Inner hole to create donut effect */}
        <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-card flex items-center justify-center">
          <div className="text-center">
            <p
              className="text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              {total}
            </p>
            <p className="text-xs text-muted-foreground font-medium">Total BAAs</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 w-full">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm text-muted-foreground">{seg.label}</span>
            <span className="ml-auto text-sm font-semibold text-foreground tabular-nums">
              {counts[seg.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
