import type { PerPharmacyPnL, RepPnL } from "../model/engine";
import { fmtPct, fmtUSD } from "../util/format";

function Row({
  label,
  value,
  indent = 0,
  bold = false,
  muted = false,
  emphasize = false,
}: {
  label: string;
  value: string;
  indent?: number;
  bold?: boolean;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <tr
      className={`${emphasize ? "border-y-2 border-slate-300 bg-slate-50" : ""}`}
    >
      <td
        className={`py-1 text-sm ${bold ? "font-semibold" : ""} ${muted ? "text-slate-500" : "text-slate-800"}`}
        style={{ paddingLeft: `${indent * 12 + 8}px` }}
      >
        {label}
      </td>
      <td
        className={`py-1 pr-2 text-right text-sm tabular-nums ${bold ? "font-semibold" : ""} ${muted ? "text-slate-500" : "text-slate-800"}`}
      >
        {value}
      </td>
    </tr>
  );
}

export function PerPharmacyTable({ p }: { p: PerPharmacyPnL }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        Per-pharmacy P&L (steady state, annual)
      </div>
      <table className="w-full">
        <tbody>
          <Row
            label="Program revenue captured"
            value={fmtUSD(p.programRevenueCaptured)}
            bold
          />
          <Row
            label="→ to pharmacy"
            value={fmtUSD(p.programRevenuePharmacyShare)}
            indent={1}
            muted
          />
          <Row
            label="→ to Sitelabs"
            value={fmtUSD(p.programRevenueSitelabs)}
            indent={1}
          />
          <Row
            label="Trial recruitment revenue"
            value={fmtUSD(p.trialRevenueTotal)}
            bold
          />
          <Row
            label="→ to pharmacy"
            value={fmtUSD(p.trialRevenuePharmacyShare)}
            indent={1}
            muted
          />
          <Row
            label="→ to Sitelabs"
            value={fmtUSD(p.trialRevenueSitelabs)}
            indent={1}
          />
          {p.baseFeeRevenue > 0 && (
            <Row label="Base / tier fees" value={fmtUSD(p.baseFeeRevenue)} />
          )}
          {p.perTaskRevenue > 0 && (
            <Row label="Per-task fees" value={fmtUSD(p.perTaskRevenue)} />
          )}
          <Row
            label="Sitelabs gross revenue"
            value={fmtUSD(p.sitelabsGrossRevenue)}
            bold
            emphasize
          />
          <Row
            label="Rep cost allocated"
            value={fmtUSD(p.repCostAllocated)}
            indent={1}
          />
          <Row
            label="Platform cost"
            value={fmtUSD(p.platformCostAnnual)}
            indent={1}
          />
          <Row
            label="QHIN allocated"
            value={fmtUSD(p.qhinAllocated)}
            indent={1}
          />
          <Row
            label="Onboarding amortized"
            value={fmtUSD(p.onboardingAmortized)}
            indent={1}
          />
          <Row label="CAC amortized" value={fmtUSD(p.cacAmortized)} indent={1} />
          <Row
            label="Direct cost subtotal"
            value={fmtUSD(p.directCostSubtotal)}
            bold
          />
          <Row label="Overhead" value={fmtUSD(p.overheadCost)} indent={1} />
          <Row label="Total cost" value={fmtUSD(p.totalCost)} bold />
          <Row
            label="Contribution margin"
            value={fmtUSD(p.contributionMargin)}
            bold
            emphasize
          />
          <Row
            label="Contribution margin %"
            value={fmtPct(p.contributionMarginPct, 1)}
            muted
          />
          <Row
            label="Avg pharmacy lifespan"
            value={`${p.avgPharmacyLifespanYears.toFixed(1)} yrs`}
            muted
          />
        </tbody>
      </table>
    </div>
  );
}

export function RepTable({ rep }: { rep: RepPnL }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        Rep team P&L (one rep, annual)
      </div>
      <table className="w-full">
        <tbody>
          <Row label="Rep revenue" value={fmtUSD(rep.repRevenue)} bold />
          <Row label="Rep direct cost" value={fmtUSD(rep.repDirectCost)} />
          <Row
            label="Rep contribution"
            value={fmtUSD(rep.repContribution)}
            bold
            emphasize
          />
          <Row
            label="Contribution / pharmacy"
            value={fmtUSD(rep.repContributionPerPharmacy)}
            muted
          />
          <Row
            label="Contribution margin %"
            value={fmtPct(rep.contributionMarginPct, 1)}
            muted
          />
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
        Marginal view: rep salary + platform only. Excludes QHIN, onboarding,
        CAC, and overhead — will look healthier than the fully-loaded
        per-pharmacy P&L.
      </p>
    </div>
  );
}
