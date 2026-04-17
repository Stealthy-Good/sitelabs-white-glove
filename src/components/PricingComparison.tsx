import type { PricingComparisonRow } from "../model/engine";
import type { PricingModel } from "../model/types";
import { fmtUSD } from "../util/format";

export function PricingComparison({
  rows,
  current,
}: {
  rows: PricingComparisonRow[];
  current: PricingModel;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        Pricing model comparison (current other assumptions)
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">
              Model
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Contribution / pharmacy
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Break-even pharmacies
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.model}
              className={`border-t border-slate-100 ${r.model === current ? "bg-indigo-50" : ""}`}
            >
              <td className="px-3 py-1.5 text-slate-800">
                {r.label}
                {r.model === current && (
                  <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    CURRENT
                  </span>
                )}
              </td>
              <td
                className={`px-3 py-1.5 text-right tabular-nums ${r.contributionPerPharmacy >= 0 ? "text-emerald-700" : "text-rose-700"}`}
              >
                {fmtUSD(r.contributionPerPharmacy)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                {r.breakEvenPharmacyCount ?? "Not reached"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
