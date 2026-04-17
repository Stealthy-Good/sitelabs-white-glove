import type { PerPharmacyPnL, RepPnL } from "../model/engine";
import { fmtUSD } from "../util/format";

type Status = "green" | "yellow" | "red";

const STATUS_STYLES: Record<Status, string> = {
  green: "bg-emerald-50 border-emerald-300 text-emerald-900",
  yellow: "bg-amber-50 border-amber-300 text-amber-900",
  red: "bg-rose-50 border-rose-300 text-rose-900",
};

const DOT_STYLES: Record<Status, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};

function Card({
  title,
  value,
  subtitle,
  status,
}: {
  title: string;
  value: string;
  subtitle: string;
  status: Status;
}) {
  return (
    <div
      className={`flex-1 rounded-lg border-2 p-4 ${STATUS_STYLES[status]}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${DOT_STYLES[status]}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{subtitle}</div>
    </div>
  );
}

function perPharmacyStatus(n: number): Status {
  if (n >= 3000) return "green";
  if (n >= 1000) return "yellow";
  return "red";
}

function repStatus(n: number): Status {
  if (n >= 30000) return "green";
  if (n >= 0) return "yellow";
  return "red";
}

function breakEvenStatus(n: number | null): Status {
  if (n === null) return "red";
  if (n <= 30) return "green";
  if (n <= 75) return "yellow";
  return "red";
}

export function ViabilityCards({
  perPharm,
  rep,
  breakEven,
  projectionBreakEvenMonth,
}: {
  perPharm: PerPharmacyPnL;
  rep: RepPnL;
  breakEven: number | null;
  projectionBreakEvenMonth: number | null;
}) {
  const projBEText =
    projectionBreakEvenMonth === null
      ? "36-mo projection never reaches monthly break-even (ongoing CAC + ramp drag)"
      : `36-mo projection turns monthly positive at month ${projectionBreakEvenMonth}`;
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Card
        title="Per-pharmacy viability"
        value={fmtUSD(perPharm.contributionMargin)}
        subtitle={`Annual contribution margin (steady state) — green > $3K, yellow $1–3K, red < $1K`}
        status={perPharmacyStatus(perPharm.contributionMargin)}
      />
      <Card
        title="Rep economics"
        value={fmtUSD(rep.repContribution)}
        subtitle={`Rep annual contribution — green > $30K, red if negative`}
        status={repStatus(rep.repContribution)}
      />
      <Card
        title="Break-even pharmacies"
        value={breakEven === null ? "Not reached" : `${breakEven}`}
        subtitle={`Steady-state (all ramped, growth paused). ${projBEText}.`}
        status={breakEvenStatus(breakEven)}
      />
    </div>
  );
}
