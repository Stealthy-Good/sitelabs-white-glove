import { useMemo } from "react";
import {
  ECONOMIC_PRESETS,
  applyEconomicPreset,
  type EconomicPreset,
  type EconomicPresetId,
} from "../model/economicPresets";
import {
  computePerPharmacy,
  computeProjection,
  computeSteadyStateBreakEven,
} from "../model/engine";
import { fmtPct, fmtUSD } from "../util/format";
import type { Assumptions } from "../model/types";

interface Props {
  current: Assumptions;
  onLoad: (id: EconomicPresetId) => void;
}

interface PresetMetrics {
  contributionPerPharm: number;
  contributionMarginPct: number;
  steadyStateBE: number | null;
  projectionBEMonth: number | null;
  cumulativeContribution36: number;
}

function computePresetMetrics(preset: EconomicPreset): PresetMetrics {
  const a = applyEconomicPreset(preset);
  const perPharm = computePerPharmacy(a);
  const proj = computeProjection(a);
  const be = computeSteadyStateBreakEven(a);
  return {
    contributionPerPharm: perPharm.contributionMargin,
    contributionMarginPct: perPharm.contributionMarginPct,
    steadyStateBE: be,
    projectionBEMonth: proj.breakEvenMonth,
    cumulativeContribution36:
      proj.months.at(-1)?.cumulativeContribution ?? 0,
  };
}

function presetMatches(preset: EconomicPreset, a: Assumptions): boolean {
  const target = applyEconomicPreset(preset);
  return JSON.stringify(target) === JSON.stringify(a);
}

const CARD_STYLES: Record<
  EconomicPresetId,
  { border: string; badge: string; button: string; accent: string }
> = {
  trial_led_network: {
    border: "border-indigo-200",
    badge: "bg-indigo-50 text-indigo-700",
    button: "bg-indigo-600 hover:bg-indigo-700",
    accent: "text-indigo-700",
  },
  platform_saas: {
    border: "border-sky-200",
    badge: "bg-sky-50 text-sky-700",
    button: "bg-sky-600 hover:bg-sky-700",
    accent: "text-sky-700",
  },
  chain_specialty: {
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-800",
    button: "bg-amber-600 hover:bg-amber-700",
    accent: "text-amber-800",
  },
};

export function EconomicPresets({ current, onLoad }: Props) {
  const presetData = useMemo(
    () =>
      ECONOMIC_PRESETS.map((p) => ({
        preset: p,
        metrics: computePresetMetrics(p),
        active: presetMatches(p, current),
      })),
    [current],
  );

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Economic model
        </h2>
        <span className="text-xs text-slate-500">
          Three viable models — each clears the economics via a different lever.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {presetData.map(({ preset, metrics, active }) => {
          const s = CARD_STYLES[preset.id];
          return (
            <div
              key={preset.id}
              className={`flex flex-col rounded-md border ${s.border} ${
                active ? "ring-2 ring-offset-1 ring-slate-400" : ""
              } bg-white p-3`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className={`text-sm font-bold ${s.accent}`}>
                  {preset.name}
                </h3>
                {active && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}
                  >
                    Loaded
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs italic text-slate-500">
                "{preset.tagline}"
              </p>
              <p className="mb-3 text-xs leading-snug text-slate-700">
                {preset.description}
              </p>

              <dl className="mb-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Contrib / pharm</dt>
                <dd className="text-right font-mono tabular-nums text-slate-800">
                  {fmtUSD(metrics.contributionPerPharm)}{" "}
                  <span className="text-slate-400">
                    ({fmtPct(metrics.contributionMarginPct, 0)})
                  </span>
                </dd>

                <dt className="text-slate-500">Steady-state BE</dt>
                <dd className="text-right font-mono tabular-nums text-slate-800">
                  {metrics.steadyStateBE === null
                    ? "—"
                    : `${metrics.steadyStateBE} pharm`}
                </dd>

                <dt className="text-slate-500">Projection BE</dt>
                <dd className="text-right font-mono tabular-nums text-slate-800">
                  {metrics.projectionBEMonth === null
                    ? "—"
                    : `Month ${metrics.projectionBEMonth}`}
                </dd>

                <dt className="text-slate-500">36-mo cum. contrib</dt>
                <dd className="text-right font-mono tabular-nums text-slate-800">
                  {fmtUSD(metrics.cumulativeContribution36)}
                </dd>
              </dl>

              <button
                onClick={() => onLoad(preset.id)}
                className={`mt-auto rounded px-3 py-1.5 text-sm font-medium text-white ${s.button}`}
              >
                {active ? "Reload preset" : "Load preset"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
