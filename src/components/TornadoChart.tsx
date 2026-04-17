import type { TornadoItem } from "../model/engine";
import { fmtUSD } from "../util/format";

export function TornadoChart({
  items,
  base,
}: {
  items: TornadoItem[];
  base: number;
}) {
  if (items.length === 0) return null;
  const maxImpact = Math.max(
    ...items.map((i) => Math.max(Math.abs(i.high - base), Math.abs(i.low - base))),
    1,
  );

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">
          Sensitivity (tornado): 36-mo cumulative contribution, ±30%
        </div>
        <div className="text-xs text-slate-600">
          Base: <span className="font-mono">{fmtUSD(base)}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((i) => {
          const lowDelta = i.low - base;
          const highDelta = i.high - base;
          const leftDelta = Math.min(lowDelta, highDelta);
          const rightDelta = Math.max(lowDelta, highDelta);
          const leftPct = Math.max(0, (-leftDelta / maxImpact) * 50);
          const rightPct = Math.max(0, (rightDelta / maxImpact) * 50);
          return (
            <div key={i.label} className="grid grid-cols-[180px_1fr_110px] items-center gap-2">
              <div className="truncate text-xs text-slate-700">{i.label}</div>
              <div className="relative h-4 rounded bg-slate-100">
                <div className="absolute left-1/2 top-0 h-full w-px bg-slate-400" />
                <div
                  className="absolute top-0 h-full bg-rose-400"
                  style={{
                    right: "50%",
                    width: `${leftPct}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full bg-emerald-400"
                  style={{
                    left: "50%",
                    width: `${rightPct}%`,
                  }}
                />
              </div>
              <div className="text-right font-mono text-[11px] text-slate-600">
                {fmtUSD(i.impact)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded bg-rose-400" />
          -30% input
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded bg-emerald-400" />
          +30% input
        </span>
      </div>
    </div>
  );
}
