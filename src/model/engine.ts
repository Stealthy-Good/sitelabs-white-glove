import type { Assumptions, PricingModel } from "./types";

export interface PerPharmacyPnL {
  programRevenueCaptured: number;
  programRevenuePharmacyShare: number;
  programRevenueSitelabs: number;
  trialRevenueTotal: number;
  trialRevenuePharmacyShare: number;
  trialRevenueSitelabs: number;
  baseFeeRevenue: number;
  perTaskRevenue: number;
  sitelabsGrossRevenue: number;
  repCostAllocated: number;
  platformCostAnnual: number;
  qhinAllocated: number;
  onboardingAmortized: number;
  cacAmortized: number;
  directCostSubtotal: number;
  overheadCost: number;
  totalCost: number;
  contributionMargin: number;
  contributionMarginPct: number;
  avgPharmacyLifespanYears: number;
}

export interface RepPnL {
  repRevenue: number;
  repDirectCost: number;
  repContribution: number;
  repContributionPerPharmacy: number;
  contributionMarginPct: number;
}

export interface MonthRow {
  month: number;
  activePharmacies: number;
  activeReps: number;
  newAdds: number;
  mrr: number;
  annualizedRevenue: number;
  monthlyRevenue: number;
  monthlyCost: number;
  monthlyContribution: number;
  cumulativeContribution: number;
}

export interface ProjectionResult {
  months: MonthRow[];
  snapshots: { label: string; row: MonthRow | null }[];
  breakEvenMonth: number | null;
  breakEvenPharmacyCount: number | null;
}

export interface TornadoItem {
  label: string;
  low: number;
  high: number;
  impact: number;
  base: number;
}

export interface PricingComparisonRow {
  model: PricingModel;
  label: string;
  contributionPerPharmacy: number;
  breakEvenPharmacyCount: number | null;
}

const PRICING_LABELS: Record<PricingModel, string> = {
  pure_rev_share: "Pure rev share",
  base_plus_rev_share: "Base + rev share",
  tiered_bundles: "Tiered bundles",
  per_task_fee: "Per-task fee",
};

export function pricingLabel(m: PricingModel): string {
  return PRICING_LABELS[m];
}

// ---- Helpers ----

function safeDiv(a: number, b: number): number {
  if (!b || !isFinite(b)) return 0;
  return a / b;
}

function lifespanYears(a: Assumptions): number {
  if (a.churnRateAnnual <= 0) return 10; // cap for math stability
  return 1 / a.churnRateAnnual;
}

// Estimated task counts per pharmacy per year (used for per-task fee model)
function estimatedTaskCounts(a: Assumptions) {
  const captured = a.unrealizedRevenuePerPharmacy * a.captureRate;
  const b = a.programRevenueBreakdown;
  const gapRev = (b.careGap + b.medicaidQuality) * captured;
  const mtmRev = b.outcomesMtm * captured;
  const intRev = (b.dirStar + b.transitionsOther) * captured;
  const AVG_GAP = 150;
  const AVG_MTM = 100;
  const AVG_INT = 50;
  return {
    gaps: gapRev / AVG_GAP,
    mtms: mtmRev / AVG_MTM,
    interventions: intRev / AVG_INT,
  };
}

// Sitelabs gross revenue per pharmacy per year at steady state
export function sitelabsRevenuePerPharmacy(a: Assumptions): {
  program: number;
  trial: number;
  base: number;
  perTask: number;
  total: number;
  programCaptured: number;
  trialTotal: number;
  pharmacyProgramShare: number;
  pharmacyTrialShare: number;
} {
  const p = a.pricing;
  const programCaptured = a.unrealizedRevenuePerPharmacy * a.captureRate;
  const trialTotal =
    a.eligiblePatientsPerPharmacy *
    a.trialConversionRate *
    a.revenuePerEnrollment;

  let pharmacyProgramPct = p.programRevSharePctPharmacy;
  let pharmacyTrialPct = p.trialRevSharePctPharmacy;
  let baseAnnual = 0;
  let perTaskAnnual = 0;
  let programToSitelabs = 0;

  switch (p.model) {
    case "pure_rev_share": {
      programToSitelabs = programCaptured * (1 - pharmacyProgramPct);
      break;
    }
    case "base_plus_rev_share": {
      programToSitelabs = programCaptured * (1 - pharmacyProgramPct);
      baseAnnual = p.monthlyBaseFee * 12;
      break;
    }
    case "tiered_bundles": {
      const mix = p.tierMix;
      const t = p.tiers;
      const blendedMonthlyFee =
        mix.essential * t.essential.monthlyFee +
        mix.pro * t.pro.monthlyFee +
        mix.enterprise * t.enterprise.monthlyFee;
      const blendedPharmacyShare =
        mix.essential * t.essential.revSharePct +
        mix.pro * t.pro.revSharePct +
        mix.enterprise * t.enterprise.revSharePct;
      pharmacyProgramPct = blendedPharmacyShare;
      programToSitelabs = programCaptured * (1 - blendedPharmacyShare);
      baseAnnual = blendedMonthlyFee * 12;
      break;
    }
    case "per_task_fee": {
      // Pharmacy keeps all program revenue
      pharmacyProgramPct = 1;
      programToSitelabs = 0;
      const tc = estimatedTaskCounts(a);
      perTaskAnnual =
        tc.gaps * p.perGapFee +
        tc.mtms * p.perMtmFee +
        tc.interventions * p.perInterventionFee;
      pharmacyTrialPct = p.perTaskTrialRevSharePctPharmacy;
      break;
    }
  }

  const trialToSitelabs = trialTotal * (1 - pharmacyTrialPct);
  const total = programToSitelabs + trialToSitelabs + baseAnnual + perTaskAnnual;

  return {
    program: programToSitelabs,
    trial: trialToSitelabs,
    base: baseAnnual,
    perTask: perTaskAnnual,
    total,
    programCaptured,
    trialTotal,
    pharmacyProgramShare: pharmacyProgramPct,
    pharmacyTrialShare: pharmacyTrialPct,
  };
}

// ---- Per-pharmacy P&L ----

export function computePerPharmacy(a: Assumptions): PerPharmacyPnL {
  const life = lifespanYears(a);
  const rev = sitelabsRevenuePerPharmacy(a);

  const repCostAllocated = safeDiv(
    a.repFullyLoadedAnnual,
    a.pharmaciesPerRep * a.repUtilization,
  );
  const platformCostAnnual = a.platformCostPerPharmacyMonthly * 12;
  const qhinAllocated = safeDiv(a.qhinFixedMonthly * 12, a.targetPharmacyCount);
  const onboardingAmortized = safeDiv(a.onboardingCostOneTime, life);
  const cacAmortized = safeDiv(a.cac, life);

  const directCostSubtotal =
    repCostAllocated +
    platformCostAnnual +
    qhinAllocated +
    onboardingAmortized +
    cacAmortized;
  const overheadCost = directCostSubtotal * a.overheadAllocationPct;
  const totalCost = directCostSubtotal + overheadCost;

  const sitelabsGrossRevenue = rev.total;
  const contributionMargin = sitelabsGrossRevenue - totalCost;

  return {
    programRevenueCaptured: rev.programCaptured,
    programRevenuePharmacyShare: rev.programCaptured * rev.pharmacyProgramShare,
    programRevenueSitelabs: rev.program,
    trialRevenueTotal: rev.trialTotal,
    trialRevenuePharmacyShare: rev.trialTotal * rev.pharmacyTrialShare,
    trialRevenueSitelabs: rev.trial,
    baseFeeRevenue: rev.base,
    perTaskRevenue: rev.perTask,
    sitelabsGrossRevenue,
    repCostAllocated,
    platformCostAnnual,
    qhinAllocated,
    onboardingAmortized,
    cacAmortized,
    directCostSubtotal,
    overheadCost,
    totalCost,
    contributionMargin,
    contributionMarginPct: safeDiv(contributionMargin, sitelabsGrossRevenue),
    avgPharmacyLifespanYears: life,
  };
}

// ---- Rep P&L ----

export function computeRep(a: Assumptions): RepPnL {
  const rev = sitelabsRevenuePerPharmacy(a);
  const effectivePharmacies = a.pharmaciesPerRep * a.repUtilization;
  const repRevenue = rev.total * effectivePharmacies;
  const repDirectCost =
    a.repFullyLoadedAnnual +
    a.pharmaciesPerRep * a.platformCostPerPharmacyMonthly * 12;
  const repContribution = repRevenue - repDirectCost;
  return {
    repRevenue,
    repDirectCost,
    repContribution,
    repContributionPerPharmacy: safeDiv(repContribution, a.pharmaciesPerRep),
    contributionMarginPct: safeDiv(repContribution, repRevenue),
  };
}

// ---- 36-month projection ----

interface Cohort {
  ageMonths: number;
  count: number;
}

export function computeProjection(
  a: Assumptions,
  months: number = 36,
): ProjectionResult {
  const monthlyChurn = 1 - Math.pow(1 - a.churnRateAnnual, 1 / 12);
  const rev = sitelabsRevenuePerPharmacy(a);
  // Monthly per-pharmacy revenue at full ramp:
  const programMonthly = rev.program / 12;
  const trialMonthly = rev.trial / 12;
  const baseMonthly = rev.base / 12;
  const perTaskMonthly = rev.perTask / 12;

  const cohorts: Cohort[] = [];
  let activeReps = 1;
  let cumulativeContribution = a.startingCashBalance;
  let breakEvenMonth: number | null = null;
  let breakEvenPharmacyCount: number | null = null;
  const rows: MonthRow[] = [];

  for (let m = 1; m <= months; m++) {
    const newAdds =
      m <= a.pilotPhaseMonths ? 1 : a.monthlyNewPharmacies;
    cohorts.push({ ageMonths: 0, count: newAdds });

    const activePharmacies = cohorts.reduce((s, c) => s + c.count, 0);

    // Determine rep count needed
    const requiredReps = Math.max(
      1,
      Math.ceil(safeDiv(activePharmacies, a.pharmaciesPerRep)),
    );
    if (requiredReps > activeReps) activeReps = requiredReps;

    // Monthly revenue per cohort based on age/ramp
    let monthlyRevenue = 0;
    for (const c of cohorts) {
      const programRamp = Math.min(
        1,
        safeDiv(c.ageMonths + 1, Math.max(1, a.rampMonths)),
      );
      const trialAge = c.ageMonths + 1 - a.timeToFirstEnrollmentMonths;
      const trialRamp =
        trialAge <= 0
          ? 0
          : Math.min(1, safeDiv(trialAge, Math.max(1, a.rampMonths)));
      const perPharmMonthly =
        programMonthly * programRamp +
        trialMonthly * trialRamp +
        baseMonthly +
        perTaskMonthly * programRamp;
      monthlyRevenue += c.count * perPharmMonthly;
    }

    // Monthly costs
    const repMonthly = (activeReps * a.repFullyLoadedAnnual) / 12;
    const platformMonthly =
      activePharmacies * a.platformCostPerPharmacyMonthly;
    const qhinMonthly = a.qhinFixedMonthly;
    const oneTime = newAdds * (a.onboardingCostOneTime + a.cac);
    const directMonthly = repMonthly + platformMonthly + qhinMonthly + oneTime;
    const overhead = directMonthly * a.overheadAllocationPct;
    const monthlyCost = directMonthly + overhead;

    const monthlyContribution = monthlyRevenue - monthlyCost;
    cumulativeContribution += monthlyContribution;

    rows.push({
      month: m,
      activePharmacies,
      activeReps,
      newAdds,
      mrr: monthlyRevenue,
      annualizedRevenue: monthlyRevenue * 12,
      monthlyRevenue,
      monthlyCost,
      monthlyContribution,
      cumulativeContribution,
    });

    if (breakEvenMonth === null && monthlyContribution > 0) {
      breakEvenMonth = m;
      breakEvenPharmacyCount = Math.round(activePharmacies);
    }

    // Apply churn at end of month (affects next month's active pharmacies)
    for (const c of cohorts) {
      c.count *= 1 - monthlyChurn;
      c.ageMonths += 1;
    }
  }

  const snapshotMonths = [6, 12, 18, 24, 36];
  const snapshots = snapshotMonths.map((mm) => ({
    label: `Month ${mm}`,
    row: rows.find((r) => r.month === mm) ?? null,
  }));

  return { months: rows, snapshots, breakEvenMonth, breakEvenPharmacyCount };
}

// ---- Steady-state break-even pharmacy count ----
// At pharmacy count N, monthly P&L fully-ramped:
//   revenue = N × gross_per_pharmacy
//   costs  = ceil(N/per_rep) × rep_annual + 12 × QHIN + 12 × N × platform
//            + N × (onboarding + CAC) / lifespan
//   then overhead
export function computeSteadyStateBreakEven(a: Assumptions): number | null {
  const rev = sitelabsRevenuePerPharmacy(a);
  const life = lifespanYears(a);
  const annualPerPharmRev = rev.total;
  const perPharmDirectVariable =
    a.platformCostPerPharmacyMonthly * 12 +
    (a.onboardingCostOneTime + a.cac) / life;

  for (let N = 1; N <= 1000; N++) {
    const reps = Math.max(1, Math.ceil(N / a.pharmaciesPerRep));
    const directAnnual =
      reps * a.repFullyLoadedAnnual +
      a.qhinFixedMonthly * 12 +
      N * perPharmDirectVariable;
    const total = directAnnual * (1 + a.overheadAllocationPct);
    const revenue = N * annualPerPharmRev;
    if (revenue >= total) return N;
  }
  return null;
}

// ---- Tornado ----

type TornadoInput = {
  label: string;
  get: (a: Assumptions) => number;
  set: (a: Assumptions, v: number) => Assumptions;
  clamp?: (v: number) => number;
};

const TORNADO_INPUTS: TornadoInput[] = [
  {
    label: "Capture rate",
    get: (a) => a.captureRate,
    set: (a, v) => ({ ...a, captureRate: v }),
    clamp: (v) => Math.max(0, Math.min(1, v)),
  },
  {
    label: "Unrealized revenue / pharmacy",
    get: (a) => a.unrealizedRevenuePerPharmacy,
    set: (a, v) => ({ ...a, unrealizedRevenuePerPharmacy: v }),
    clamp: (v) => Math.max(0, v),
  },
  {
    label: "Pharmacies per rep",
    get: (a) => a.pharmaciesPerRep,
    set: (a, v) => ({ ...a, pharmaciesPerRep: v }),
    clamp: (v) => Math.max(1, Math.round(v)),
  },
  {
    label: "Program rev share (pharmacy)",
    get: (a) => a.pricing.programRevSharePctPharmacy,
    set: (a, v) => ({
      ...a,
      pricing: { ...a.pricing, programRevSharePctPharmacy: v },
    }),
    clamp: (v) => Math.max(0, Math.min(1, v)),
  },
  {
    label: "Trial conversion",
    get: (a) => a.trialConversionRate,
    set: (a, v) => ({ ...a, trialConversionRate: v }),
    clamp: (v) => Math.max(0, Math.min(1, v)),
  },
  {
    label: "CAC",
    get: (a) => a.cac,
    set: (a, v) => ({ ...a, cac: v }),
    clamp: (v) => Math.max(0, v),
  },
  {
    label: "Churn rate",
    get: (a) => a.churnRateAnnual,
    set: (a, v) => ({ ...a, churnRateAnnual: v }),
    clamp: (v) => Math.max(0.001, Math.min(0.99, v)),
  },
];

export function computeTornado(a: Assumptions): {
  base: number;
  items: TornadoItem[];
} {
  const base = computeProjection(a).months.at(-1)?.cumulativeContribution ?? 0;
  const items: TornadoItem[] = TORNADO_INPUTS.map((ti) => {
    const cur = ti.get(a);
    const lowV = ti.clamp ? ti.clamp(cur * 0.7) : cur * 0.7;
    const highV = ti.clamp ? ti.clamp(cur * 1.3) : cur * 1.3;
    const low =
      computeProjection(ti.set(a, lowV)).months.at(-1)
        ?.cumulativeContribution ?? 0;
    const high =
      computeProjection(ti.set(a, highV)).months.at(-1)
        ?.cumulativeContribution ?? 0;
    return {
      label: ti.label,
      low,
      high,
      impact: Math.abs(high - low),
      base,
    };
  });
  items.sort((a, b) => b.impact - a.impact);
  return { base, items };
}

// ---- Pricing comparison ----

export function computePricingComparison(
  a: Assumptions,
): PricingComparisonRow[] {
  const models: PricingModel[] = [
    "pure_rev_share",
    "base_plus_rev_share",
    "tiered_bundles",
    "per_task_fee",
  ];
  return models.map((m) => {
    const mod: Assumptions = {
      ...a,
      pricing: { ...a.pricing, model: m },
    };
    const pnl = computePerPharmacy(mod);
    const be = computeSteadyStateBreakEven(mod);
    return {
      model: m,
      label: PRICING_LABELS[m],
      contributionPerPharmacy: pnl.contributionMargin,
      breakEvenPharmacyCount: be,
    };
  });
}
