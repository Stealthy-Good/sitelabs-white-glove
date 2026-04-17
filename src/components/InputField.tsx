import { useId, useState } from "react";

interface BaseProps {
  label: string;
  tooltip?: string;
  unit?: "usd" | "pct" | "months" | "count" | "none";
}

interface NumberProps extends BaseProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  slider?: boolean;
  display?: "usd" | "pct" | "number";
}

export function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-300"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-0 top-5 z-20 w-64 whitespace-normal rounded border border-slate-200 bg-white p-2 text-xs font-normal text-slate-700 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

function formatDisplay(n: number, display?: "usd" | "pct" | "number"): string {
  if (display === "usd") return n.toString();
  if (display === "pct") return (n * 100).toFixed(0);
  return n.toString();
}

function parseDisplay(s: string, display?: "usd" | "pct" | "number"): number {
  const cleaned = s.replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  if (display === "pct") return n / 100;
  return n;
}

export function NumberInput(props: NumberProps) {
  const id = useId();
  const {
    label,
    tooltip,
    value,
    onChange,
    min,
    max,
    step,
    slider = true,
    display = "number",
  } = props;

  const sliderValue = display === "pct" ? value * 100 : value;
  const sliderMin = display === "pct" ? (min ?? 0) * 100 : (min ?? 0);
  const sliderMax = display === "pct" ? (max ?? 1) * 100 : (max ?? 100);
  const sliderStep = step ?? (display === "pct" ? 1 : 1);

  const prefix = display === "usd" ? "$" : "";
  const suffix = display === "pct" ? "%" : "";

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </label>
        <div className="flex items-center gap-1 text-sm">
          {prefix && <span className="text-slate-500">{prefix}</span>}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            className="w-24 rounded border border-slate-300 px-2 py-0.5 text-right text-sm focus:border-slate-500 focus:outline-none"
            value={formatDisplay(value, display)}
            onChange={(e) => onChange(parseDisplay(e.target.value, display))}
          />
          {suffix && <span className="text-slate-500">{suffix}</span>}
        </div>
      </div>
      {slider && (
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          value={sliderValue}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(display === "pct" ? n / 100 : n);
          }}
          className="w-full accent-indigo-600"
        />
      )}
    </div>
  );
}

interface SelectProps<T extends string> {
  label: string;
  tooltip?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function SelectInput<T extends string>(props: SelectProps<T>) {
  const id = useId();
  return (
    <div className="mb-3">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {props.label}
        {props.tooltip && <Tooltip text={props.tooltip} />}
      </label>
      <select
        id={id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
