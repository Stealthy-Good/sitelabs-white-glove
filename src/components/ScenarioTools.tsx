import { useState } from "react";
import type { Assumptions, SavedScenario } from "../model/types";
import {
  computePerPharmacy,
  computeProjection,
  computeRep,
  computeSteadyStateBreakEven,
} from "../model/engine";
import { fmtPct, fmtUSD } from "../util/format";

interface Props {
  a: Assumptions;
  onLoadPreset: (p: "base" | "pessimistic" | "optimistic") => void;
  savedScenarios: SavedScenario[];
  saveScenario: (name: string) => void;
  deleteScenario: (id: string) => void;
  loadScenario: (id: string) => void;
}

function scenarioToCsv(
  a: Assumptions,
  name = "current",
): string {
  const perPharm = computePerPharmacy(a);
  const rep = computeRep(a);
  const proj = computeProjection(a);
  const be = computeSteadyStateBreakEven(a);
  const final = proj.months.at(-1);

  const lines: string[] = [];
  lines.push("section,key,value");
  lines.push(`scenario,name,${name}`);
  lines.push(`scenario,exportedAt,${new Date().toISOString()}`);

  const addAll = (section: string, obj: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "object" && v !== null) {
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
          lines.push(`${section},${k}.${k2},${JSON.stringify(v2)}`);
        }
      } else {
        lines.push(`${section},${k},${JSON.stringify(v)}`);
      }
    }
  };
  addAll("assumptions", a as unknown as Record<string, unknown>);
  addAll("perPharmacyPnL", perPharm as unknown as Record<string, unknown>);
  addAll("repPnL", rep as unknown as Record<string, unknown>);
  lines.push(`company,breakEvenPharmacyCount,${be ?? "null"}`);
  lines.push(`company,breakEvenMonth,${proj.breakEvenMonth ?? "null"}`);
  if (final) {
    lines.push(`company,month36Pharmacies,${final.activePharmacies.toFixed(1)}`);
    lines.push(`company,month36AnnualizedRevenue,${final.annualizedRevenue.toFixed(0)}`);
    lines.push(`company,month36CumulativeContribution,${final.cumulativeContribution.toFixed(0)}`);
  }
  return lines.join("\n");
}

function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ScenarioTools({
  a,
  onLoadPreset,
  savedScenarios,
  saveScenario,
  deleteScenario,
  loadScenario,
}: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-3),
    );
  };

  const compareScenarios: SavedScenario[] = selected
    .map((id) => savedScenarios.find((s) => s.id === id))
    .filter((s): s is SavedScenario => !!s);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">Presets:</span>
        <button
          onClick={() => onLoadPreset("pessimistic")}
          className="rounded border border-rose-300 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800 hover:bg-rose-100"
        >
          Pessimistic
        </button>
        <button
          onClick={() => onLoadPreset("base")}
          className="rounded border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Base case
        </button>
        <button
          onClick={() => onLoadPreset("optimistic")}
          className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Optimistic
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              download(
                `sitelabs-scenario-${Date.now()}.json`,
                JSON.stringify(a, null, 2),
                "application/json",
              )
            }
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export JSON
          </button>
          <button
            onClick={() =>
              download(
                `sitelabs-scenario-${Date.now()}.csv`,
                scenarioToCsv(a),
                "text/csv",
              )
            }
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">
          Save current scenario:
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scenario name"
          className="flex-1 min-w-[200px] rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={() => {
            if (!name.trim()) return;
            saveScenario(name.trim());
            setName("");
          }}
          disabled={!name.trim()}
          className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300"
        >
          Save
        </button>
      </div>

      {savedScenarios.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Saved scenarios ({savedScenarios.length})
            </div>
            <button
              onClick={() => setShowCompare((s) => !s)}
              disabled={selected.length < 2}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
            >
              {showCompare ? "Hide comparison" : `Compare (${selected.length} selected)`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Select</th>
                  <th className="px-2 py-1 text-left font-semibold">Name</th>
                  <th className="px-2 py-1 text-left font-semibold">Saved</th>
                  <th className="px-2 py-1 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {savedScenarios.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                    <td className="px-2 py-1 text-slate-800">{s.name}</td>
                    <td className="px-2 py-1 text-slate-500">
                      {new Date(s.savedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => loadScenario(s.id)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteScenario(s.id)}
                        className="ml-1 rounded border border-rose-200 bg-white px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showCompare && compareScenarios.length >= 2 && (
            <ScenarioComparisonTable scenarios={compareScenarios} />
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioComparisonTable({
  scenarios,
}: {
  scenarios: SavedScenario[];
}) {
  const rows = scenarios.map((s) => {
    const perPharm = computePerPharmacy(s.assumptions);
    const rep = computeRep(s.assumptions);
    const be = computeSteadyStateBreakEven(s.assumptions);
    const proj = computeProjection(s.assumptions);
    const final = proj.months.at(-1);
    return {
      scenario: s,
      perPharm,
      rep,
      be,
      projFinal: final,
      projBE: proj.breakEvenMonth,
    };
  });

  return (
    <div className="mt-3 overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-2 py-1 text-left font-semibold">Metric</th>
            {rows.map((r) => (
              <th
                key={r.scenario.id}
                className="px-2 py-1 text-right font-semibold"
              >
                {r.scenario.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <ComparisonRow
            label="Sitelabs rev / pharm"
            values={rows.map((r) => fmtUSD(r.perPharm.sitelabsGrossRevenue))}
          />
          <ComparisonRow
            label="Cost / pharm"
            values={rows.map((r) => fmtUSD(r.perPharm.totalCost))}
          />
          <ComparisonRow
            label="Contribution / pharm"
            values={rows.map((r) => fmtUSD(r.perPharm.contributionMargin))}
          />
          <ComparisonRow
            label="Contribution margin %"
            values={rows.map((r) => fmtPct(r.perPharm.contributionMarginPct, 1))}
          />
          <ComparisonRow
            label="Rep contribution"
            values={rows.map((r) => fmtUSD(r.rep.repContribution))}
          />
          <ComparisonRow
            label="Break-even pharms (steady state)"
            values={rows.map((r) =>
              r.be === null ? "—" : r.be.toString(),
            )}
          />
          <ComparisonRow
            label="Break-even month"
            values={rows.map((r) =>
              r.projBE === null ? "—" : r.projBE.toString(),
            )}
          />
          <ComparisonRow
            label="Month 36 pharmacies"
            values={rows.map((r) =>
              r.projFinal ? r.projFinal.activePharmacies.toFixed(0) : "—",
            )}
          />
          <ComparisonRow
            label="Month 36 ann. revenue"
            values={rows.map((r) =>
              r.projFinal ? fmtUSD(r.projFinal.annualizedRevenue) : "—",
            )}
          />
          <ComparisonRow
            label="Month 36 cum. contribution"
            values={rows.map((r) =>
              r.projFinal ? fmtUSD(r.projFinal.cumulativeContribution) : "—",
            )}
          />
        </tbody>
      </table>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-2 py-1 text-slate-700">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-2 py-1 text-right font-mono tabular-nums">
          {v}
        </td>
      ))}
    </tr>
  );
}
