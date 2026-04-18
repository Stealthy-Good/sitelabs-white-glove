import { BASE_ASSUMPTIONS } from "./defaults";
import type { Assumptions } from "./types";

export type EconomicPresetId =
  | "trial_led_network"
  | "platform_saas"
  | "chain_specialty";

type PricingOverride = Partial<Omit<Assumptions["pricing"], "tiers" | "tierMix">> & {
  tiers?: Partial<Assumptions["pricing"]["tiers"]>;
  tierMix?: Partial<Assumptions["pricing"]["tierMix"]>;
};

export type EconomicPresetOverrides = Partial<Omit<Assumptions, "pricing">> & {
  pricing?: PricingOverride;
};

export interface EconomicPreset {
  id: EconomicPresetId;
  name: string;
  tagline: string;
  description: string;
  overrides: EconomicPresetOverrides;
}

// Trial-led network: the pharmacy network is trial infrastructure.
// Program rev share is the hook (70% to pharmacy), trials are the monetization
// (15% to pharmacy, 85% Sitelabs on ~$38K/yr per pharmacy trial revenue).
const TRIAL_LED: EconomicPreset = {
  id: "trial_led_network",
  name: "Trial-led network",
  tagline: "The pharmacy network is trial infrastructure",
  description:
    "Sitelabs is fundamentally a clinical trial recruitment platform. Program rev share is a generous, easy-sell hook; trial economics (~5x program revenue) carry the model.",
  overrides: {
    eligiblePatientsPerPharmacy: 80,
    trialConversionRate: 0.12,
    revenuePerEnrollment: 4000,
    monthlyNewPharmacies: 5,
    pricing: {
      model: "pure_rev_share",
      programRevSharePctPharmacy: 0.7,
      trialRevSharePctPharmacy: 0.15,
    },
  },
};

// Platform SaaS: Sitelabs is software, reps are customer success.
// Tiered bundles with meaningful monthly fees. Subscription revenue
// (~$10K/pharm/yr blended) carries the economics before rev share matters.
const PLATFORM_SAAS: EconomicPreset = {
  id: "platform_saas",
  name: "Platform SaaS",
  tagline: "Sitelabs is software, reps are CS",
  description:
    "Tiered bundles ($200 / $750 / $2,000). Reps become customer success managers serving 20 pharmacies each. Subscription carries the economics; rev share is secondary.",
  overrides: {
    captureRate: 0.65,
    pharmaciesPerRep: 20,
    platformCostPerPharmacyMonthly: 55,
    monthlyNewPharmacies: 5,
    pricing: {
      model: "tiered_bundles",
      tiers: {
        essential: {
          name: "Essential",
          monthlyFee: 200,
          revSharePct: 0.3,
          includedServices: 2,
        },
        pro: {
          name: "Pro",
          monthlyFee: 750,
          revSharePct: 0.4,
          includedServices: 4,
        },
        enterprise: {
          name: "Enterprise",
          monthlyFee: 2000,
          revSharePct: 0.5,
          includedServices: 8,
        },
      },
      tierMix: { essential: 0.3, pro: 0.5, enterprise: 0.2 },
    },
  },
};

// Chain / specialty focus: enterprise accounts, not the long tail.
// Chains, specialty pharmacies, MSO-affiliated groups where unrealized
// revenue is 2-3x ($35K/yr) and patient pools are larger (100 trial-eligible).
// Base + rev share at $750/mo and 40% to pharmacy. Higher CAC and onboarding,
// but lower churn because integration switching costs are real.
const CHAIN_SPECIALTY: EconomicPreset = {
  id: "chain_specialty",
  name: "Chain / specialty focus",
  tagline: "Enterprise accounts, not the long tail",
  description:
    "Target chains, specialty pharmacies, and MSO-affiliated groups. Fewer accounts per rep (10), enterprise CAC ($8K), deeper onboarding ($5K), but lower churn (8%) because integration switching costs are real.",
  overrides: {
    unrealizedRevenuePerPharmacy: 35000,
    eligiblePatientsPerPharmacy: 100,
    pharmaciesPerRep: 10,
    cac: 8000,
    onboardingCostOneTime: 5000,
    churnRateAnnual: 0.08,
    monthlyNewPharmacies: 2,
    pricing: {
      model: "base_plus_rev_share",
      monthlyBaseFee: 750,
      programRevSharePctPharmacy: 0.4,
    },
  },
};

export const ECONOMIC_PRESETS: EconomicPreset[] = [
  TRIAL_LED,
  PLATFORM_SAAS,
  CHAIN_SPECIALTY,
];

export function applyEconomicPreset(preset: EconomicPreset): Assumptions {
  // Start fresh from base so presets are fully deterministic, not compounding
  // on whatever the user has currently set.
  const base = BASE_ASSUMPTIONS;
  const o = preset.overrides;
  return {
    ...base,
    ...o,
    programRevenueBreakdown: {
      ...base.programRevenueBreakdown,
      ...(o.programRevenueBreakdown ?? {}),
    },
    pricing: {
      ...base.pricing,
      ...(o.pricing ?? {}),
      tiers: {
        essential: {
          ...base.pricing.tiers.essential,
          ...(o.pricing?.tiers?.essential ?? {}),
        },
        pro: {
          ...base.pricing.tiers.pro,
          ...(o.pricing?.tiers?.pro ?? {}),
        },
        enterprise: {
          ...base.pricing.tiers.enterprise,
          ...(o.pricing?.tiers?.enterprise ?? {}),
        },
      },
      tierMix: {
        ...base.pricing.tierMix,
        ...(o.pricing?.tierMix ?? {}),
      },
    },
  };
}
