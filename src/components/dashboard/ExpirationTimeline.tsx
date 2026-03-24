"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MonthBucket {
  label: string;
  count: number;
  /** 0 = this month, 1 = next month, etc. */
  monthOffset: number;
}

interface ExpirationTimelineProps {
  buckets: MonthBucket[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBarColor(monthOffset: number): string {
  if (monthOffset === 0) return "#B91C1C"; // this month — red
  if (monthOffset <= 2) return "#B45309"; // next 2 months — amber
  return "#64748B"; // later — slate
}

function getBarBg(monthOffset: number): string {
  if (monthOffset === 0) return "#FEE2E2";
  if (monthOffset <= 2) return "#FEF3C7";
  return "#F1F5F9";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExpirationTimeline({ buckets }: ExpirationTimelineProps) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {buckets.map((bucket) => {
        const widthPct = Math.max((bucket.count / maxCount) * 100, 0);
        const color = getBarColor(bucket.monthOffset);
        const bg = getBarBg(bucket.monthOffset);

        return (
          <div key={bucket.label} className="flex items-center gap-3">
            {/* Month label */}
            <span className="w-16 shrink-0 text-sm text-muted-foreground text-right font-medium">
              {bucket.label}
            </span>

            {/* Bar track */}
            <div
              className="flex-1 h-7 rounded-md relative overflow-hidden"
              style={{ backgroundColor: bg }}
            >
              {/* Filled bar */}
              <div
                className="h-full rounded-md transition-all duration-500 ease-out"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  minWidth: bucket.count > 0 ? "24px" : "0px",
                }}
              />
            </div>

            {/* Count */}
            <span
              className="w-8 text-sm font-semibold tabular-nums text-right"
              style={{ color }}
            >
              {bucket.count}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
        {[
          { label: "This month", color: "#B91C1C" },
          { label: "2-3 months", color: "#B45309" },
          { label: "Later", color: "#64748B" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
