import type { Assumptions } from "./types";

export const BASE_ASSUMPTIONS: Assumptions = {
  unrealizedRevenuePerPharmacy: 15000,
  captureRate: 0.6,
  rampMonths: 6,
  programRevenueBreakdown: {
    medicaidQuality: 0.35,
    outcomesMtm: 0.25,
    dirStar: 0.2,
    careGap: 0.15,
    transitionsOther: 0.05,
  },

  eligiblePatientsPerPharmacy: 40,
  trialConversionRate: 0.08,
  revenuePerEnrollment: 2500,
  timeToFirstEnrollmentMonths: 4,

  pricing: {
    model: "pure_rev_share",
    programRevSharePctPharmacy: 0.5,
    trialRevSharePctPharmacy: 0.2,
    monthlyBaseFee: 200,
    tiers: {
      essential: {
        name: "Essential",
        monthlyFee: 150,
        revSharePct: 0.3,
        includedServices: 2,
      },
      pro: {
        name: "Pro",
        monthlyFee: 500,
        revSharePct: 0.4,
        includedServices: 4,
      },
      enterprise: {
        name: "Enterprise",
        monthlyFee: 1500,
        revSharePct: 0.5,
        includedServices: 8,
      },
    },
    tierMix: { essential: 0.5, pro: 0.4, enterprise: 0.1 },
    perGapFee: 50,
    perMtmFee: 75,
    perInterventionFee: 25,
  },

  repFullyLoadedAnnual: 95000,
  pharmaciesPerRep: 15,
  repUtilization: 0.85,
  platformCostPerPharmacyMonthly: 40,
  qhinFixedMonthly: 5000,
  onboardingCostOneTime: 1500,
  cac: 2000,
  overheadAllocationPct: 0.15,

  targetPharmacyCount: 50,
  monthlyNewPharmacies: 3,
  pilotPhaseMonths: 6,
  churnRateAnnual: 0.1,
  startingCashBalance: 0,
};

export const PESSIMISTIC_OVERRIDES: Partial<Assumptions> = {
  captureRate: 0.4,
  trialConversionRate: 0.04,
  pharmaciesPerRep: 10,
  churnRateAnnual: 0.2,
  unrealizedRevenuePerPharmacy: 10000,
  revenuePerEnrollment: 1500,
};

export const OPTIMISTIC_OVERRIDES: Partial<Assumptions> = {
  captureRate: 0.75,
  trialConversionRate: 0.12,
  pharmaciesPerRep: 20,
  churnRateAnnual: 0.05,
  unrealizedRevenuePerPharmacy: 22000,
  revenuePerEnrollment: 3500,
};

export function applyPreset(
  base: Assumptions,
  preset: "base" | "pessimistic" | "optimistic",
): Assumptions {
  if (preset === "base") return { ...BASE_ASSUMPTIONS };
  const overrides =
    preset === "pessimistic" ? PESSIMISTIC_OVERRIDES : OPTIMISTIC_OVERRIDES;
  return { ...base, ...overrides };
}
