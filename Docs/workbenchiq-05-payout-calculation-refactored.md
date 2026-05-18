# payout-calculation (refactored exemplar)

> **Source:** Refactored from `tpmn-workbenchiq-contracts/workbenchiq-05-payout-calculation.md` per [contract-authoring-guide.md](contract-authoring-guide.md).
> **Why refactored:** Original `F:` block conflated preconditions (Steps 1-2) with pure compute (Steps 3-6). Phase-2 runtime needs a clean P_pre / F / P_post split so L1, CE, and L2 each receive a clean payload. See guide §2 and §7 for the conflation rationale and diff summary.
> **Format version:** Authoring Guide v1.0 (2026-05-16)

**Workflow:** Insurance Claims Workflow
**Domain:** Insurance Claims
**Contract:** `payout_calculation: A → B | P_pre ⊕ P_post`

---

## A: Input

```yaml
repair_estimate:
  amount: decimal                      # claimed repair cost
  line_items:
    - description: string
      cost: decimal

damage_assessment:                     # Result from Stage 02
  severity: enum                       # MINOR | MODERATE | SEVERE | TOTAL_LOSS
  estimated_repair_range:
    min: decimal
    max: decimal
  is_total_loss: bool

liability_assessment:                  # Result from Stage 03
  determination: enum                  # CLEAR | SHARED | DISPUTED
  insured_fault_pct: int               # 0-100
  other_party_fault_pct: int           # 0-100
```

---

## P_pre: Preconditions

### Type Alignment
- `repair_estimate.amount` must be a `decimal > 0`.
- `repair_estimate.line_items` must be a non-empty `array` with each entry having both `description` (non-empty string) and `cost` (decimal ≥ 0).
- `damage_assessment.estimated_repair_range` present with both `min` and `max` decimals; `min ≤ max`.
- `damage_assessment.severity` ∈ {MINOR, MODERATE, SEVERE, TOTAL_LOSS}.
- `liability_assessment.determination` ∈ {CLEAR, SHARED, DISPUTED}; `insured_fault_pct + other_party_fault_pct == 100`.

### Format Validation
- `repair_estimate.amount ≤ $1,000,000` (sanity cap on automated payout — exceeding values must route to manual underwriting).
- Sum of `repair_estimate.line_items[].cost` matches `repair_estimate.amount` within ±1% (line items must reconcile to the claimed total).
- `damage_assessment.estimated_repair_range.max ≥ damage_assessment.estimated_repair_range.min` (range well-formed).

### Regulation/Compliance Gates
- `PAY-001` (payout calculation methodology) policy reference loadable from policy DB.
- `PAY-002` (payout adjustment rules) policy reference loadable from policy DB.
- `liability_assessment.determination ≠ "DISPUTED"` *(Gate G4 — pipeline halts before payout calc on disputed liability; see WorkbenchIQ pipeline gates)*.

---

## F: Processing Logic

1. **Check Estimate Inflation** — Compare each `repair_estimate.line_items[].cost` to the typical range for the corresponding damage severity (from PAY-002 adjustment rules). For each line item exceeding the typical-range max, generate an `adjustments` entry `{ item, original, adjusted, reason: "exceeds-typical-range" }` and set `adjusted := typical_range_max`.

2. **Adjust for Fault Percentage** — If `liability_assessment.determination == "SHARED"`, scale the payout: `fault_adjusted_amount := pre_fault_amount × (liability_assessment.other_party_fault_pct / 100)`. If `determination == "CLEAR"`, `fault_adjusted_amount := pre_fault_amount` (no scaling).

3. **Compute Variance** — `variance := abs(repair_estimate.amount - damage_assessment.estimated_repair_range.max) / damage_assessment.estimated_repair_range.max`. Set `requires_independent_appraisal := (variance > 0.20)`.

4. **Calculate Recommended Payout** — Apply policy limits and deductibles per PAY-001: `recommended_payout := min(fault_adjusted_amount - applied_adjustments_total, policy_limit)`. Set `estimate_status`:
   - `"approved"` if no adjustments fired AND `requires_independent_appraisal == false`
   - `"adjusted"` if any inflation adjustments fired AND `requires_independent_appraisal == false`
   - `"requires_review"` if `requires_independent_appraisal == true`

   Populate `policy_citations`: always include `"PAY-001"`; include `"PAY-002"` if any inflation adjustment fired.

---

## B: Output

```yaml
estimate_status:                enum         # approved | adjusted | requires_review
original_estimate:              decimal      # echo repair_estimate.amount from input
recommended_payout:             decimal      # final calculated payout
adjustments:                    array[object] # [{ item: string, original: decimal, adjusted: decimal, reason: string }]
requires_independent_appraisal: bool         # true when variance > 0.20
policy_citations:               array[string] # e.g. ["PAY-001"], ["PAY-001", "PAY-002"]
```

---

## P_post: Postconditions

### Correctness
- `recommended_payout ≤ original_estimate` (no payout inflation).
- `recommended_payout ≤ policy_limits` (sourced from claim data via PAY-001).
- `len(policy_citations) ≥ 1` (PAY-001 always cited).
- `requires_independent_appraisal == true` iff `abs(original_estimate - damage_assessment.estimated_repair_range.max) / damage_assessment.estimated_repair_range.max > 0.20`.

### Gates
- `variance > 0.20` ⟹ `requires_independent_appraisal == true` AND `estimate_status == "requires_review"` (route to adjuster review — pipeline does NOT auto-approve).
- `estimate_status == "approved"` is the ONLY pathway to auto-approval; `"adjusted"` and `"requires_review"` MUST route to adjuster queue.

### SPT Compliance
- **No Local→Global generalisation:** payout calculation specific to THIS claim's damage and liability; not generalisable to all similar claims.
- **No State→Trait attribution:** adjustments reflect THIS estimate's accuracy; not a permanent attribute of the repair shop or claimant.
- **No Δe→∫de extrapolation:** `recommended_payout` applies to THIS claim only; not predictive for future claims.

---

## Circus Executor

**stage_type:** llm-assisted
**agent_role:** payout-calculation-agent
**routing_priority:** high
**trust_gate_L1:** 70 *// company policy: pre-checks are structural — moderate threshold acceptable since the rule list is short and mostly type-shape; per WorkbenchIQ InsClaims-PolicyDoc §4.2 (stage-type-llm-assisted L1 floor)*
**trust_gate_L2:** 85 *// company policy: payout-affecting outputs require high confidence — money in flight; per WorkbenchIQ governance standard for any output with recommended_payout > $0*

---

## Diff Summary — what changed from the original

```
Original layout                            →  Refactored layout
─────────────────────────────────────────     ───────────────────────────────────────
A                                          →  A (unchanged)
F: 6 steps (validation conflated)          →  P_pre (NEW, 3 subgroups)
                                              ├── Type Alignment      ← from F step 1
                                              ├── Format Validation   ← derived from claim-data sanity
                                              └── Regulation/Compliance Gates ← from F step 2 + Gate G4
                                           →  F: 4 steps (pure compute) ← from F steps 3-6 renumbered
B                                          →  B (unchanged)
P: Correctness / Gates / SPT               →  P_post: same three subgroups
Circus Executor (placeholder)              →  Circus Executor (explicit trust gates + comments)
```

**Five things to notice:**

1. Original F step 1 (*"Validate Estimate Against Damage"*) was a precondition disguised as compute → moved to `P_pre → Type Alignment` + `Format Validation`.
2. Original F step 2 (*"Apply Payout Policies — Match against PAY-001/002"*) was actually a check that the policy references LOAD → moved to `P_pre → Regulation/Compliance Gates`. The actual application of PAY-001 happens in refactored F step 4 (`Calculate Recommended Payout`) which is correctly compute.
3. Original F step 5 (*"Flag Independent Appraisal"*) was the variance computation that PRODUCES a B field (`requires_independent_appraisal`) → STAYS in F as refactored step 3 (`Compute Variance`). It's compute, not validation.
4. Gate G4 (`determination ≠ DISPUTED`) is now explicitly in P_pre — L1 will reject DISPUTED claims before any CE invocation, matching the WorkbenchIQ pipeline diagram (`G4: Liability Settled — Halt before payout calculation`).
5. `trust_gate_L1` / `trust_gate_L2` were placeholders in the original (`GEM² truth_score ≥ 85 required`); refactor splits the values per gate (L1 lower, L2 higher) AND adds the mandatory company-policy comment per authoring guide §5.

---

*Refactored 2026-05-16 | Authoring Guide v1.0 | AI Agent Olympics | GEM².AI*
