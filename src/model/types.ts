export type PricingModel =
  | "pure_rev_share"
  | "base_plus_rev_share"
  | "tiered_bundles"
  | "per_task_fee";

export interface Tier {
  name: string;
  monthlyFee: number;
  revSharePct: number;
  includedServices: number;
}

export interface TierMix {
  essential: number;
  pro: number;
  enterprise: number;
}

export interface PricingConfig {
  model: PricingModel;

  // pure_rev_share / base_plus_rev_share
  programRevSharePctPharmacy: number; // pharmacy's share of program revenue
  trialRevSharePctPharmacy: number; // pharmacy's share of trial revenue
  monthlyBaseFee: number;

  // tiered bundles
  tiers: { essential: Tier; pro: Tier; enterprise: Tier };
  tierMix: TierMix;

  // per-task fee
  perGapFee: number;
  perMtmFee: number;
  perInterventionFee: number;
  perTaskTrialRevSharePctPharmacy: number;
}

export interface ProgramRevenueBreakdown {
  medicaidQuality: number; // percent of unrealized revenue
  outcomesMtm: number;
  dirStar: number;
  careGap: number;
  transitionsOther: number;
}

export interface Assumptions {
  // Section A: pharmacy revenue capture
  unrealizedRevenuePerPharmacy: number;
  captureRate: number; // 0..1
  rampMonths: number;
  programRevenueBreakdown: ProgramRevenueBreakdown;

  // Section B: trial recruitment
  eligiblePatientsPerPharmacy: number;
  trialConversionRate: number; // 0..1
  revenuePerEnrollment: number;
  timeToFirstEnrollmentMonths: number;

  // Section C: pricing
  pricing: PricingConfig;

  // Section D: costs
  repFullyLoadedAnnual: number;
  pharmaciesPerRep: number;
  repUtilization: number; // 0..1
  platformCostPerPharmacyMonthly: number;
  qhinFixedMonthly: number;
  onboardingCostOneTime: number;
  cac: number;
  overheadAllocationPct: number; // 0..1

  // Section E: scale
  targetPharmacyCount: number;
  monthlyNewPharmacies: number;
  pilotPhaseMonths: number;
  churnRateAnnual: number; // 0..1
  startingCashBalance: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  assumptions: Assumptions;
}
