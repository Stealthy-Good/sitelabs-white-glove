import { useState } from "react";
import type { Assumptions, PricingModel } from "../model/types";
import { NumberInput, SelectInput } from "./InputField";

interface Props {
  a: Assumptions;
  update: (patch: Partial<Assumptions>) => void;
  updatePricing: (patch: Partial<Assumptions["pricing"]>) => void;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-3">{children}</div>
      )}
    </div>
  );
}

export function AssumptionsPanel({ a, update, updatePricing }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const p = a.pricing;

  return (
    <div>
      <Section title="A. Pharmacy revenue capture">
        <NumberInput
          label="Unrealized program revenue / pharmacy / yr"
          tooltip="Total program dollars an independent pharmacy could capture but isn't. Default $15K based on North Shore Pharmacy: $10–20K/yr across Medicaid gaps, MTM, and outcomes."
          value={a.unrealizedRevenuePerPharmacy}
          onChange={(v) => update({ unrealizedRevenuePerPharmacy: v })}
          min={5000}
          max={40000}
          step={500}
          display="usd"
        />
        <NumberInput
          label="Capture rate"
          tooltip="Share of unrealized revenue Sitelabs actually collects. Not every gap closes, not every MTM completes."
          value={a.captureRate}
          onChange={(v) => update({ captureRate: v })}
          min={0.2}
          max={0.9}
          step={0.01}
          display="pct"
        />
        <NumberInput
          label="Ramp to full capture (months)"
          tooltip="Months for a new pharmacy to reach full capture, linear ramp."
          value={a.rampMonths}
          onChange={(v) => update({ rampMonths: Math.round(v) })}
          min={1}
          max={12}
          step={1}
          display="number"
        />
        <button
          type="button"
          onClick={() => setShowBreakdown((s) => !s)}
          className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {showBreakdown ? "Hide detail" : "Show program revenue breakdown"}
        </button>
        {showBreakdown && (
          <div className="mt-2 rounded bg-slate-50 p-2">
            <p className="mb-2 text-xs text-slate-600">
              Splits the unrealized revenue into categories. Percentages
              needn't sum to 100% — they're weights for per-task modeling.
            </p>
            <NumberInput
              label="Medicaid quality programs"
              value={a.programRevenueBreakdown.medicaidQuality}
              onChange={(v) =>
                update({
                  programRevenueBreakdown: {
                    ...a.programRevenueBreakdown,
                    medicaidQuality: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
            <NumberInput
              label="Outcomes MTM"
              value={a.programRevenueBreakdown.outcomesMtm}
              onChange={(v) =>
                update({
                  programRevenueBreakdown: {
                    ...a.programRevenueBreakdown,
                    outcomesMtm: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
            <NumberInput
              label="DIR / STAR adherence"
              value={a.programRevenueBreakdown.dirStar}
              onChange={(v) =>
                update({
                  programRevenueBreakdown: {
                    ...a.programRevenueBreakdown,
                    dirStar: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
            <NumberInput
              label="Care gap closures"
              value={a.programRevenueBreakdown.careGap}
              onChange={(v) =>
                update({
                  programRevenueBreakdown: {
                    ...a.programRevenueBreakdown,
                    careGap: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
            <NumberInput
              label="Transitions / other"
              value={a.programRevenueBreakdown.transitionsOther}
              onChange={(v) =>
                update({
                  programRevenueBreakdown: {
                    ...a.programRevenueBreakdown,
                    transitionsOther: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
          </div>
        )}
      </Section>

      <Section title="B. Clinical trial recruitment">
        <NumberInput
          label="Trial-eligible patients / pharmacy / yr"
          tooltip="Patients identified as eligible across active studies."
          value={a.eligiblePatientsPerPharmacy}
          onChange={(v) => update({ eligiblePatientsPerPharmacy: v })}
          min={0}
          max={200}
          step={1}
        />
        <NumberInput
          label="Conversion rate (identified → enrolled)"
          value={a.trialConversionRate}
          onChange={(v) => update({ trialConversionRate: v })}
          min={0.02}
          max={0.2}
          step={0.005}
          display="pct"
        />
        <NumberInput
          label="Revenue per enrollment"
          value={a.revenuePerEnrollment}
          onChange={(v) => update({ revenuePerEnrollment: v })}
          min={500}
          max={10000}
          step={100}
          display="usd"
        />
        <NumberInput
          label="Pharmacy's share of trial recruitment"
          tooltip="Pharmacy's upside for being the trust layer. Configured separately from program rev share."
          value={p.trialRevSharePctPharmacy}
          onChange={(v) =>
            updatePricing({ trialRevSharePctPharmacy: v })
          }
          min={0}
          max={1}
          step={0.01}
          display="pct"
        />
        <NumberInput
          label="Time to first enrollment (months)"
          value={a.timeToFirstEnrollmentMonths}
          onChange={(v) =>
            update({ timeToFirstEnrollmentMonths: Math.round(v) })
          }
          min={0}
          max={12}
          step={1}
        />
      </Section>

      <Section title="C. Pricing model">
        <SelectInput<PricingModel>
          label="Model"
          value={p.model}
          onChange={(v) => updatePricing({ model: v })}
          options={[
            { value: "pure_rev_share", label: "Pure rev share" },
            { value: "base_plus_rev_share", label: "Base + rev share" },
            { value: "tiered_bundles", label: "Tiered bundles" },
            { value: "per_task_fee", label: "Per-task fee" },
          ]}
        />

        {(p.model === "pure_rev_share" ||
          p.model === "base_plus_rev_share") && (
          <>
            {p.model === "base_plus_rev_share" && (
              <NumberInput
                label="Monthly base fee"
                value={p.monthlyBaseFee}
                onChange={(v) => updatePricing({ monthlyBaseFee: v })}
                min={0}
                max={2000}
                step={25}
                display="usd"
              />
            )}
            <NumberInput
              label="Program rev share (pharmacy %)"
              tooltip="Pharmacy's share of captured program revenue. Sitelabs keeps the rest."
              value={p.programRevSharePctPharmacy}
              onChange={(v) =>
                updatePricing({ programRevSharePctPharmacy: v })
              }
              min={0}
              max={1}
              step={0.01}
              display="pct"
            />
          </>
        )}

        {p.model === "tiered_bundles" && (
          <div className="space-y-3">
            {(["essential", "pro", "enterprise"] as const).map((tk) => {
              const t = p.tiers[tk];
              return (
                <div
                  key={tk}
                  className="rounded border border-slate-200 p-2"
                >
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    {t.name}
                  </div>
                  <NumberInput
                    label="Monthly fee"
                    value={t.monthlyFee}
                    onChange={(v) =>
                      updatePricing({
                        tiers: {
                          ...p.tiers,
                          [tk]: { ...t, monthlyFee: v },
                        },
                      })
                    }
                    min={0}
                    max={3000}
                    step={25}
                    display="usd"
                  />
                  <NumberInput
                    label="Pharmacy rev share"
                    value={t.revSharePct}
                    onChange={(v) =>
                      updatePricing({
                        tiers: {
                          ...p.tiers,
                          [tk]: { ...t, revSharePct: v },
                        },
                      })
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    display="pct"
                  />
                  <NumberInput
                    label="Included services"
                    value={t.includedServices}
                    onChange={(v) =>
                      updatePricing({
                        tiers: {
                          ...p.tiers,
                          [tk]: { ...t, includedServices: Math.round(v) },
                        },
                      })
                    }
                    min={0}
                    max={20}
                    step={1}
                  />
                </div>
              );
            })}
            <div className="rounded border border-slate-200 p-2">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Pharmacy mix
              </div>
              <NumberInput
                label="% Essential"
                value={p.tierMix.essential}
                onChange={(v) =>
                  updatePricing({
                    tierMix: { ...p.tierMix, essential: v },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                display="pct"
              />
              <NumberInput
                label="% Pro"
                value={p.tierMix.pro}
                onChange={(v) =>
                  updatePricing({
                    tierMix: { ...p.tierMix, pro: v },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                display="pct"
              />
              <NumberInput
                label="% Enterprise"
                value={p.tierMix.enterprise}
                onChange={(v) =>
                  updatePricing({
                    tierMix: { ...p.tierMix, enterprise: v },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                display="pct"
              />
            </div>
          </div>
        )}

        {p.model === "per_task_fee" && (
          <>
            <NumberInput
              label="Per gap closed"
              tooltip="Flat fee Sitelabs charges the pharmacy per closed care gap."
              value={p.perGapFee}
              onChange={(v) => updatePricing({ perGapFee: v })}
              min={0}
              max={300}
              step={5}
              display="usd"
            />
            <NumberInput
              label="Per MTM completed"
              value={p.perMtmFee}
              onChange={(v) => updatePricing({ perMtmFee: v })}
              min={0}
              max={500}
              step={5}
              display="usd"
            />
            <NumberInput
              label="Per intervention"
              value={p.perInterventionFee}
              onChange={(v) => updatePricing({ perInterventionFee: v })}
              min={0}
              max={200}
              step={5}
              display="usd"
            />
          </>
        )}
      </Section>

      <Section title="D. Cost structure">
        <NumberInput
          label="Rep fully-loaded annual cost"
          tooltip="Salary + benefits + equipment for one Sitelabs rep."
          value={a.repFullyLoadedAnnual}
          onChange={(v) => update({ repFullyLoadedAnnual: v })}
          min={50000}
          max={200000}
          step={5000}
          display="usd"
        />
        <NumberInput
          label="Pharmacies per rep"
          value={a.pharmaciesPerRep}
          onChange={(v) => update({ pharmaciesPerRep: Math.round(v) })}
          min={5}
          max={30}
          step={1}
        />
        <NumberInput
          label="Rep utilization"
          tooltip="Share of rep time that converts to pharmacy work (excludes PTO, training, meetings)."
          value={a.repUtilization}
          onChange={(v) => update({ repUtilization: v })}
          min={0.5}
          max={1}
          step={0.01}
          display="pct"
        />
        <NumberInput
          label="Platform cost / pharmacy / month"
          tooltip="AI/LLM tokens, PMS access infrastructure, QHIN connection amortization, Twilio stack, audit logging."
          value={a.platformCostPerPharmacyMonthly}
          onChange={(v) => update({ platformCostPerPharmacyMonthly: v })}
          min={0}
          max={200}
          step={5}
          display="usd"
        />
        <NumberInput
          label="QHIN / data infra fixed / month"
          value={a.qhinFixedMonthly}
          onChange={(v) => update({ qhinFixedMonthly: v })}
          min={0}
          max={20000}
          step={500}
          display="usd"
        />
        <NumberInput
          label="Onboarding cost (one-time)"
          tooltip="Rep time + legal/BAA + PMS integration for a new pharmacy."
          value={a.onboardingCostOneTime}
          onChange={(v) => update({ onboardingCostOneTime: v })}
          min={0}
          max={10000}
          step={100}
          display="usd"
        />
        <NumberInput
          label="Customer acquisition cost"
          value={a.cac}
          onChange={(v) => update({ cac: v })}
          min={0}
          max={10000}
          step={100}
          display="usd"
        />
        <NumberInput
          label="Overhead allocation"
          tooltip="Management, G&A, compliance — applied as % of direct costs."
          value={a.overheadAllocationPct}
          onChange={(v) => update({ overheadAllocationPct: v })}
          min={0}
          max={0.5}
          step={0.01}
          display="pct"
        />
      </Section>

      <Section title="E. Scale parameters">
        <NumberInput
          label="Target pharmacy count"
          value={a.targetPharmacyCount}
          onChange={(v) => update({ targetPharmacyCount: Math.round(v) })}
          min={5}
          max={500}
          step={5}
        />
        <NumberInput
          label="Monthly new pharmacies (post-pilot)"
          value={a.monthlyNewPharmacies}
          onChange={(v) => update({ monthlyNewPharmacies: v })}
          min={0}
          max={20}
          step={0.5}
        />
        <NumberInput
          label="Pilot phase length (months)"
          tooltip="During pilot, 1 pharmacy added per month."
          value={a.pilotPhaseMonths}
          onChange={(v) => update({ pilotPhaseMonths: Math.round(v) })}
          min={0}
          max={18}
          step={1}
        />
        <NumberInput
          label="Annual churn rate"
          value={a.churnRateAnnual}
          onChange={(v) => update({ churnRateAnnual: v })}
          min={0}
          max={0.4}
          step={0.01}
          display="pct"
        />
        <NumberInput
          label="Starting cash balance"
          value={a.startingCashBalance}
          onChange={(v) => update({ startingCashBalance: v })}
          min={-1000000}
          max={5000000}
          step={10000}
          display="usd"
          slider={false}
        />
      </Section>
    </div>
  );
}
