import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionResult } from "../model/engine";
import { fmtUSD } from "../util/format";

export function ProjectionChart({ proj }: { proj: ProjectionResult }) {
  const data = proj.months.map((m) => ({
    month: m.month,
    "Annualized revenue": Math.round(m.annualizedRevenue),
    "Annualized cost": Math.round(m.monthlyCost * 12),
    "Cumulative contribution": Math.round(m.cumulativeContribution),
  }));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">
          36-month projection
        </div>
        <div className="text-xs text-slate-600">
          {proj.breakEvenMonth !== null ? (
            <>
              Break-even at month <b>{proj.breakEvenMonth}</b>{" "}
              (~{proj.breakEvenPharmacyCount} pharmacies)
            </>
          ) : (
            "No monthly break-even in 36 months"
          )}
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
              }
            />
            <Tooltip
              formatter={(v) => fmtUSD(Number(v))}
              labelFormatter={(m) => `Month ${m}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="Annualized revenue"
              stroke="#10b981"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Annualized cost"
              stroke="#ef4444"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Cumulative contribution"
              stroke="#6366f1"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProjectionSnapshotTable({ proj }: { proj: ProjectionResult }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-700">
              Snapshot
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Pharmacies
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Reps
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              MRR
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Ann. revenue
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Mo. contribution
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Cum. contribution
            </th>
          </tr>
        </thead>
        <tbody>
          {proj.snapshots.map((s) => (
            <tr key={s.label} className="border-t border-slate-100">
              <td className="px-3 py-1.5 text-slate-800">{s.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? s.row.activePharmacies.toFixed(0) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? s.row.activeReps : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? fmtUSD(s.row.mrr) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? fmtUSD(s.row.annualizedRevenue) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? fmtUSD(s.row.monthlyContribution) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {s.row ? fmtUSD(s.row.cumulativeContribution) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
