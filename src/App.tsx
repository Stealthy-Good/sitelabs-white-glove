import { useEffect, useMemo, useState } from "react";
import { AssumptionsPanel } from "./components/AssumptionsPanel";
import { ViabilityCards } from "./components/ViabilityCards";
import { PerPharmacyTable, RepTable } from "./components/PnLTables";
import {
  ProjectionChart,
  ProjectionSnapshotTable,
} from "./components/ProjectionChart";
import { TornadoChart } from "./components/TornadoChart";
import { PricingComparison } from "./components/PricingComparison";
import { ScenarioTools } from "./components/ScenarioTools";
import { EconomicPresets } from "./components/EconomicPresets";
import { BASE_ASSUMPTIONS, applyPreset } from "./model/defaults";
import {
  ECONOMIC_PRESETS,
  applyEconomicPreset,
  type EconomicPresetId,
} from "./model/economicPresets";
import type { Assumptions, SavedScenario } from "./model/types";
import {
  computePerPharmacy,
  computePricingComparison,
  computeProjection,
  computeRep,
  computeSteadyStateBreakEven,
  computeTornado,
} from "./model/engine";

const LS_ASSUMPTIONS = "sitelabs.assumptions.v1";
const LS_SCENARIOS = "sitelabs.scenarios.v1";

function loadAssumptions(): Assumptions {
  try {
    const raw = localStorage.getItem(LS_ASSUMPTIONS);
    if (!raw) return BASE_ASSUMPTIONS;
    const parsed = JSON.parse(raw);
    // merge with defaults so newly added fields don't break
    return {
      ...BASE_ASSUMPTIONS,
      ...parsed,
      programRevenueBreakdown: {
        ...BASE_ASSUMPTIONS.programRevenueBreakdown,
        ...(parsed.programRevenueBreakdown ?? {}),
      },
      pricing: {
        ...BASE_ASSUMPTIONS.pricing,
        ...(parsed.pricing ?? {}),
        tiers: {
          ...BASE_ASSUMPTIONS.pricing.tiers,
          ...(parsed.pricing?.tiers ?? {}),
        },
        tierMix: {
          ...BASE_ASSUMPTIONS.pricing.tierMix,
          ...(parsed.pricing?.tierMix ?? {}),
        },
      },
    };
  } catch {
    return BASE_ASSUMPTIONS;
  }
}

function loadScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(LS_SCENARIOS);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScenario[];
  } catch {
    return [];
  }
}

export default function App() {
  const [a, setA] = useState<Assumptions>(() => loadAssumptions());
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() =>
    loadScenarios(),
  );

  useEffect(() => {
    localStorage.setItem(LS_ASSUMPTIONS, JSON.stringify(a));
  }, [a]);

  useEffect(() => {
    localStorage.setItem(LS_SCENARIOS, JSON.stringify(scenarios));
  }, [scenarios]);

  const update = (patch: Partial<Assumptions>) =>
    setA((cur) => ({ ...cur, ...patch }));
  const updatePricing = (patch: Partial<Assumptions["pricing"]>) =>
    setA((cur) => ({ ...cur, pricing: { ...cur.pricing, ...patch } }));

  const perPharm = useMemo(() => computePerPharmacy(a), [a]);
  const rep = useMemo(() => computeRep(a), [a]);
  const proj = useMemo(() => computeProjection(a), [a]);
  const breakEven = useMemo(() => computeSteadyStateBreakEven(a), [a]);
  const tornado = useMemo(() => computeTornado(a), [a]);
  const pricingRows = useMemo(() => computePricingComparison(a), [a]);

  const onLoadPreset = (p: "base" | "pessimistic" | "optimistic") => {
    setA((cur) => applyPreset(cur, p));
  };

  const onLoadEconomicPreset = (id: EconomicPresetId) => {
    const preset = ECONOMIC_PRESETS.find((p) => p.id === id);
    if (preset) setA(applyEconomicPreset(preset));
  };

  const saveScenario = (name: string) => {
    const s: SavedScenario = {
      id: `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      savedAt: new Date().toISOString(),
      assumptions: a,
    };
    setScenarios((cur) => [s, ...cur]);
  };

  const deleteScenario = (id: string) => {
    setScenarios((cur) => cur.filter((s) => s.id !== id));
  };

  const loadScenario = (id: string) => {
    const s = scenarios.find((s) => s.id === id);
    if (s) setA(s.assumptions);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Sitelabs White Glove — Economic Model
            </h1>
            <p className="text-xs text-slate-600">
              Interactive viability model: per-pharmacy, per-rep, company
              rollup. All changes recalculate live and persist locally.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Reset all assumptions to base case defaults?")) {
                setA(BASE_ASSUMPTIONS);
              }
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset to defaults
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pt-4">
        <EconomicPresets current={a} onLoad={onLoadEconomicPreset} />
      </div>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Assumptions
          </h2>
          <AssumptionsPanel
            a={a}
            update={update}
            updatePricing={updatePricing}
          />
        </aside>

        <section className="space-y-4">
          <ViabilityCards
            perPharm={perPharm}
            rep={rep}
            breakEven={breakEven}
            projectionBreakEvenMonth={proj.breakEvenMonth}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PerPharmacyTable p={perPharm} />
            <div className="space-y-4">
              <RepTable rep={rep} />
              <PricingComparison rows={pricingRows} current={a.pricing.model} />
            </div>
          </div>

          <ProjectionChart proj={proj} />
          <ProjectionSnapshotTable proj={proj} />

          <TornadoChart items={tornado.items} base={tornado.base} />

          <ScenarioTools
            a={a}
            onLoadPreset={onLoadPreset}
            savedScenarios={scenarios}
            saveScenario={saveScenario}
            deleteScenario={deleteScenario}
            loadScenario={loadScenario}
          />

          <footer className="pb-6 pt-2 text-center text-xs text-slate-500">
            All figures are modeled estimates. Revenue assumptions are steady
            state post-ramp unless labeled otherwise. Scenarios and assumptions
            are stored in <code>localStorage</code>.
          </footer>
        </section>
      </main>
    </div>
  );
}
