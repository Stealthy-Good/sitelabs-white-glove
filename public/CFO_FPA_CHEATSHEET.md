# Sitelabs White Glove — CFO / FP&A Cheat Sheet

Audit of the viability model in `src/model/engine.ts` + `src/model/defaults.ts`.
All numbers were re-derived by hand and re-run against a JS replica of the engine;
every figure below ties to the code cited.

---

## 1. Architecture in one paragraph

The model has **three layered views** of the same business. They share inputs
but use different cost treatments, so their numbers do not, and are not meant
to, reconcile cleanly:

| View | What it answers | Treatment of acquisition costs | Treatment of overhead | Treatment of QHIN |
|---|---|---|---|---|
| **Per-pharmacy P&L** (steady state) | "Is a mature pharmacy profitable?" | CAC + onboarding **amortized over lifespan** (1 / annual churn) | 15% applied on top of direct | Fixed $ / month allocated across **target** pharmacy count |
| **Per-rep P&L** (steady state) | "Is an individual rep's book profitable?" | **Excluded** | **Excluded** | **Excluded** |
| **36-month projection** (cash-style) | "When do we stop bleeding each month?" | CAC + onboarding **expensed in the month acquired** | 15% applied on top of direct | Flat $ / month regardless of volume |

These three views will all show different "profitability" for the same
assumptions. That is by design but must be communicated to any reader.

---

## 2. Assumption inventory (base case)

Source: `src/model/defaults.ts:3-65`.

### A. Program revenue capture
| Input | Base | Notes |
|---|---|---|
| Unrealized program rev / pharmacy / yr | **$15,000** | Slider 5K–40K |
| Capture rate | **60%** | Share Sitelabs actually collects |
| Ramp months | **6** | Linear from 0→1 over 6 mo |
| Program rev mix (Medicaid / MTM / DIR / Gap / Other) | 35 / 25 / 20 / 15 / 5 | Only used by **per-task** pricing; engine does **not** validate that it sums to 100% |

### B. Trial recruitment
| Input | Base |
|---|---|
| Eligible patients / pharmacy / yr | 40 |
| Conversion (identified → enrolled) | 8% |
| Revenue per enrollment | $2,500 |
| Time to first enrollment | 4 months |

Trial revenue per pharmacy (gross) = 40 × 8% × $2,500 = **$8,000 / yr**.

### C. Pricing (four switchable models)
| Model | Pharmacy keeps | Sitelabs earns per pharmacy / yr (base) |
|---|---|---|
| **Pure rev share** | 50% of program, 80% of trial | $4,500 + $6,400 = **$10,900** |
| **Base + rev share** | Same splits + $200/mo fee | $10,900 + $2,400 = **$13,300** |
| **Tiered bundles** | 50/40/30% of program by tier | blended fee $530/mo + $3,960 rev share + $6,400 trial = **$17,260** |
| **Per-task fee** | Pharmacy keeps **100%** of program | $50/gap, $75/MTM, $25/intervention + trial = **$10,713** |

### D. Costs
| Input | Base |
|---|---|
| Rep fully-loaded annual | $95,000 |
| Pharmacies / rep | 15 |
| Rep utilization | 85% |
| Platform / pharmacy / month | $40 |
| QHIN / data infra fixed / month | $5,000 |
| Onboarding one-time | $1,500 |
| CAC | $2,000 |
| Overhead | 15% of direct |

### E. Scale
| Input | Base |
|---|---|
| Target pharmacy count (for QHIN allocation only) | 50 |
| Monthly new pharmacies (post-pilot) | 3 |
| Pilot phase length | 6 months (1 new / month) |
| Annual churn | 10% |
| Starting cash | $0 |

---

## 3. Formula reference

Line numbers refer to `src/model/engine.ts`.

### 3.1 Revenue per pharmacy (steady state)
Function: `sitelabsRevenuePerPharmacy` (engine.ts:110).

```
programCaptured  = unrealizedRev × captureRate
trialTotal       = eligiblePatients × trialConvRate × revenuePerEnrollment

# Splits (Sitelabs share):
programToSitelabs = programCaptured × (1 − pharmacyProgramShare)
trialToSitelabs   = trialTotal     × (1 − pharmacyTrialShare)

# Pricing-model add-ons:
pure_rev_share        → baseAnnual = 0,  perTaskAnnual = 0
base_plus_rev_share   → baseAnnual = monthlyBaseFee × 12
tiered_bundles        → baseAnnual = Σ(mix_i × monthlyFee_i) × 12
                        pharmacyProgramShare = Σ(mix_i × revShare_i)  # blended
per_task_fee          → pharmacyProgramShare = 100%  (pharmacy keeps all program)
                        perTaskAnnual = gaps×gapFee + mtms×mtmFee + ints×intFee
                        where:
                          gaps       = (careGap + medicaidQuality) × captured / $150
                          mtms       = outcomesMtm × captured / $100
                          interventions = (dirStar + transitionsOther) × captured / $50

sitelabsGrossRevenue = programToSitelabs + trialToSitelabs + baseAnnual + perTaskAnnual
```

> ⚠️ **Hard-coded constants**: $150/gap, $100/MTM, $50/intervention (engine.ts:99-101)
> are baked into the per-task model. They are not exposed in the UI.

### 3.2 Per-pharmacy P&L (steady state)
Function: `computePerPharmacy` (engine.ts:192).

```
lifespan            = 1 / churnRateAnnual                  (capped at 10 yrs if churn ≤ 0)
repCostAllocated    = repFullyLoadedAnnual / (pharmPerRep × repUtilization)
platformCostAnnual  = platformMonthly × 12
qhinAllocated       = (qhinFixedMonthly × 12) / targetPharmacyCount
onboardingAmortized = onboardingOneTime / lifespan
cacAmortized        = cac / lifespan

directCostSubtotal  = rep + platform + qhin + onboard + cac (all annual per pharmacy)
overhead            = directCostSubtotal × overheadAllocationPct
totalCost           = directCostSubtotal + overhead

contributionMargin  = sitelabsGrossRevenue − totalCost
```

### 3.3 Rep P&L (steady state)
Function: `computeRep` (engine.ts:243).

```
effectivePharmacies = pharmPerRep × repUtilization
repRevenue         = sitelabsGrossRevenuePerPharm × effectivePharmacies
repDirectCost      = repFullyLoadedAnnual + pharmPerRep × platformMonthly × 12
repContribution    = repRevenue − repDirectCost
```

> ⚠️ Excludes QHIN, onboarding, CAC, overhead, and amortization. This view is
> **incremental / marginal** — use for go/no-go on a rep hire, not for
> company-level economics.

### 3.4 Steady-state break-even
Function: `computeSteadyStateBreakEven` (engine.ts:375). Returns the smallest
N where:

```
reps(N) = max(1, ⌈N / pharmPerRep⌉)
annualRev   = N × sitelabsGrossRevenue
annualCost  = [reps(N) × repFullyLoaded  +  qhin × 12  +  N × (platform×12 + (onboard + cac)/lifespan)]
              × (1 + overhead)
return first N where annualRev ≥ annualCost, else null (search cap: N = 1000)
```

### 3.5 36-month projection
Function: `computeProjection` (engine.ts:267).

- **Monthly churn** = `1 − (1 − churnAnnual)^(1/12)` — geometric decay applied
  at end of each month to every existing cohort.
- **Cohort ramp**: each cohort's revenue scales by `min(1, (age+1) / rampMonths)`
  for program + per-task. Trial ramp starts after `timeToFirstEnrollmentMonths`.
- **Reps hired** on step function: `ceil(active / pharmPerRep)`, monotonic
  (reps never decrease), ignores `repUtilization`.
- **CAC + onboarding**: fully **expensed in month acquired** — not amortized.
- **QHIN**: fixed $5K/mo always, regardless of pharmacy count.
- **Break-even month**: first month `monthlyContribution > 0`.
- **`cumulativeContribution`** is seeded with `startingCashBalance`, so this
  line is **cash-like**, not P&L contribution. Don't confuse it with
  enterprise contribution margin.

---

## 4. Walkthrough: base case, line by line

**Per-pharmacy P&L, base case, pure rev share.** Every figure below was
re-derived by hand and matched the engine to the cent.

| Line | Calc | $ |
|---|---|---:|
| Program captured | 15,000 × 0.60 | 9,000.00 |
| &nbsp;&nbsp;→ to pharmacy | 9,000 × 0.50 | 4,500.00 |
| &nbsp;&nbsp;→ to Sitelabs | 9,000 × 0.50 | **4,500.00** |
| Trial revenue total | 40 × 0.08 × 2,500 | 8,000.00 |
| &nbsp;&nbsp;→ to pharmacy | 8,000 × 0.20 | 1,600.00 |
| &nbsp;&nbsp;→ to Sitelabs | 8,000 × 0.80 | **6,400.00** |
| **Sitelabs gross revenue** | 4,500 + 6,400 | **10,900.00** |
| Rep cost allocated | 95,000 / (15 × 0.85) | 7,450.98 |
| Platform | 40 × 12 | 480.00 |
| QHIN allocated | 60,000 / 50 | 1,200.00 |
| Onboarding amortized | 1,500 / 10 | 150.00 |
| CAC amortized | 2,000 / 10 | 200.00 |
| Direct subtotal |   | 9,480.98 |
| Overhead | 9,480.98 × 0.15 | 1,422.15 |
| **Total cost** |   | **10,903.13** |
| **Contribution margin** | 10,900 − 10,903 | **−$3.13** |

**Base case per-pharmacy contribution is essentially zero.** The ViabilityCard
will render red (< $1K). This is not a bug — it's an honest signal that the
"pure rev share, 50% to pharmacy, 15K unrealized" configuration does not
clear the bar.

---

## 5. Sensitivity of the model to pricing choice

Same base inputs, only pricing model changes (contribution per pharmacy / yr):

| Pricing | Gross rev | Contribution | CM % | Steady-state BE |
|---|---:|---:|---:|---:|
| Pure rev share | $10,900 | **−$3** | −0% | 29 |
| Base + rev share ($200/mo) | $13,300 | **+$2,397** | 18% | 15 |
| Tiered bundles | $17,260 | **+$6,357** | 37% | 11 |
| Per-task fee | $10,713 | **−$191** | −2% | 30 |

**Takeaway:** pricing model is the single largest lever. Base case is right
at breakeven precisely because the defaults give the pharmacy half of the
program revenue, and program rev share + trial rev share alone don't cover
rep + QHIN + overhead at a 15-pharmacies-per-rep book.

---

## 6. Break-even has a sawtooth, and the headline number hides it

The steady-state function returns the **first** N that clears break-even.
But reps are a step function (one new rep per 15 pharmacies), so the next
rep hire pushes you back into loss. Base case steady-state profit by N:

| N | Reps | Revenue | Total cost | P&L |
|---:|:---:|---:|---:|---:|
| 15 | 1 | $163,500 | $192,567 | **−$29,067** |
| 16 | 2 | $174,400 | $302,772 | **−$128,372** |
| 29 | 2 | $316,100 | $315,181 | **+$920** ← engine reports this |
| 30 | 2 | $327,000 | $316,135 | +$10,865 |
| 31 | 3 | $337,900 | $426,339 | **−$88,439** |
| 44 | 3 | $479,600 | $438,748 | +$40,852 |
| 45 | 3 | $490,500 | $439,702 | +$50,798 |
| 46 | 4 | $501,400 | $549,907 | **−$48,507** |

**Treat "break-even = 29" as a floor, not a plateau.** The business oscillates
across a rep-hire cliff every 15 pharmacies until the next full book. Plan
hiring to land rep N+1 at or past the next break-even count (e.g. don't
hire rep 2 until pharmacy 28–29).

---

## 7. 36-month projection, base case

| Snapshot | Active pharm | Reps | Monthly rev | Monthly cost | Monthly contrib | Cumulative |
|---|---:|---:|---:|---:|---:|---:|
| M6 | 5.9 | 1 | $1,531 | $19,149 | −$17,618 | −$110,461 |
| M12 | 23.2 | 2 | $9,148 | $37,100 | −$27,952 | −$271,910 |
| M18 | 39.6 | 3 | $23,058 | $46,959 | −$23,901 | −$431,482 |
| M24 | 55.2 | 4 | $37,209 | $56,780 | −$19,571 | −$563,942 |
| M36 | 84.0 | 6 | $63,369 | $76,313 | −$12,944 | −$771,328 |

**The base case never reaches monthly break-even in 36 months.** The viability
card will say "Not reached." This is because rep capacity is added each 15
pharmacies on a step, while active pharmacy growth (3/mo with 10% churn)
doesn't fill the rep book fast enough to out-earn the next hire.

For comparison, the presets (stored scenarios) all clear break-even:

| Preset | CM / pharm | Steady BE | Projection BE | M36 cumulative |
|---|---:|---:|---:|---:|
| Trial-led network | $24,437 | 6 | M16 | +$1.76M |
| Platform SaaS | $13,400 | 9 | M13 | +$1.43M |
| Chain / specialty | $21,619 | 5 | M18 | +$0.25M |

---

## 8. Things to flag when presenting this model

These are not bugs, but interpretive traps that will bite a CFO audience:

1. **Base case is calibrated to ~zero, not to a business target.** The
   defaults land at −$3 per pharmacy for a reason — this is a viability
   model, not a pitch model. Set assumptions (pricing, capture, CAC) before
   quoting any headline number.

2. **Rep hiring ignores utilization in the projection** (engine.ts:294-298).
   Headcount is `ceil(active / pharmPerRep)`; the per-pharmacy P&L uses
   `pharmPerRep × utilization`. These two layers will not tie.

3. **"Contribution margin" in the per-pharmacy table** includes overhead,
   amortized CAC, amortized onboarding, and allocated QHIN. It is a
   **fully-allocated margin**, not a true variable contribution. Don't
   compare it to a classic SaaS gross margin.

4. **"Rep contribution"** excludes overhead, QHIN, CAC, and onboarding
   entirely. In the base case it shows +$36,775 / rep — while the same
   pharmacies, viewed per-pharmacy, show −$3 each (×12.75 effective = −$40).
   Different denominators, different exclusions.

5. **Cumulative contribution ≠ cash.** The projection adds CAC +
   onboarding as a period expense (no capitalization, no tax, no working
   capital). It is close to "contribution ex-D&A" but marketed as a
   viability / runway line. Starting balance gets added in but nothing
   else that is balance-sheet like.

6. **QHIN is allocated across `targetPharmacyCount`** in the per-pharmacy
   view, not the actual active count. If the business is below target,
   each pharmacy is under-allocated QHIN. Set `targetPharmacyCount` to the
   current count, not the aspiration, when reading per-pharm margin.

7. **Program revenue breakdown is not validated to 100%.** Edge case: a
   user could enter shares summing to anything — the per-task fee model
   will scale linearly, so totals can be off. The share weights are only
   used by per-task pricing.

8. **Lifespan is `1 / annualChurn`** — geometric-mean implied, not cohort
   tenure. At 10% churn → 10 yr expected life; at 20% → 5 yr. The
   projection applies actual monthly decay, so cumulative cohort retention
   differs slightly from `1/churn`.

9. **Tornado swing is ±30%**, clamped (engine.ts:405-451). Input-specific
   clamps (`Math.round` for pharmPerRep, `[0, 1]` for rates) mean low/high
   may not be symmetric around the base — the "impact" metric is
   `|high − low|`, which hides which side is risk vs. upside.

10. **Pilot + post-pilot ramp is discontinuous.** Months 1–6 add 1/month;
    month 7 jumps to 3/month. There's no smooth transition. This produces
    a small discontinuity in the cost curve at the pilot boundary that
    viewers sometimes ask about.

11. **No taxes, no interest, no D&A, no working capital, no deferred
    revenue.** This is an operating contribution model. FCF and P&L
    proper would require additional layers.

---

## 9. Quick reference: levers ranked by dollar sensitivity (default tornado)

For the base case 36-month cumulative contribution, the inputs sorted by
absolute impact of a ±30% swing:

1. Unrealized revenue per pharmacy
2. Capture rate
3. Program rev share to pharmacy (inverse — lower → better for Sitelabs)
4. Churn rate (inverse)
5. Pharmacies per rep
6. Trial conversion
7. CAC

Use this to frame which assumptions deserve the most discovery in a
customer / investor conversation.

---

## 10. Verification log

All figures in sections 4, 5, 6, 7 above were independently recomputed in
JavaScript against a replica of `engine.ts` and matched the production
engine outputs exactly. The walkthrough in §4 reconciles to the cent; the
pricing comparison in §5, sawtooth in §6, and snapshots in §7 reconcile to
the dollar after rounding.
