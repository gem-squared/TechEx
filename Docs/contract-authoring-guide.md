# Contract Authoring Guide — Phase-2 Demo System

**Audience:** Human authors AND AI.Crafter (Wolfi/Gemini) when generating new TPMN contracts.
**Last Updated:** 2026-05-16
**Status:** Prescriptive — every contract authored for Phase-2 runtime MUST follow this format.
**Companion files:** [demo-action-plan.md](demo-action-plan.md), [pitch-deck-strategy.md](pitch-deck-strategy.md), [AUDIT_GATE_API.md](https://gem2-tpmn-checker.fly.dev) (external)

---

## §1 What is a TPMN contract

A TPMN contract is a typed transformation expressed as:

```
F : A → B | P
```

Read: "Function F transforms input state A into output state B, subject to predicates P."

- **A** — input type/schema (what the contract receives)
- **B** — output type/schema (what the contract produces)
- **F** — pure processing logic (the LLM's instruction set, no validation)
- **P** — predicates that gate the transformation

In Phase-2 runtime, every contract is bracketed by two audit gates:

```
       ┌─ L1 P-checker ─┐                 ┌─ L2 O-checker ─┐
  I →  │ verify(I, A,   │  →  F(I) = O →  │ verify(O, B,   │  →  next step
       │      P_pre)    │                 │       P_post)  │
       └───  ALLOW ─────┘                 └─── SUCCESS ────┘
            DENY → halt                       FAILURE → halt
```

- **L1** (Pre-execution gate) validates I against A and P_pre BEFORE F runs.
- **CE** (Contract-Executor — Vultr open-source LLM) runs F: I → O.
- **L2** (Post-execution gate) validates O against B and P_post AFTER F runs.

Within the gate boundary, the CE cannot hallucinate a decision — it can only produce O that survives L2 validation.

---

## §2 Why split P into P_pre and P_post

Most legacy TPMN contracts (including the WorkbenchIQ set) collapse all predicates into a single `P:` block while putting validation steps INSIDE the `F:` numbered list. Example from `workbenchiq-05-payout-calculation.md` (BEFORE):

```
## F: Processing Logic
1. **Validate Estimate Against Damage** — Cross-check repair_estimate.amount
   against damage_assessment.estimated_repair_range
2. **Apply Payout Policies** — Match against PAY-001 and PAY-002
3. **Check Estimate Inflation** — Flag excessive line items...
4. **Adjust for Fault Percentage** — Multiply payout by fault_pct/100...
5. **Flag Independent Appraisal** — Require if variance > 20%
6. **Calculate Recommended Payout** — Apply policy limits...
```

The problem: steps 1-2 are PRECONDITION checks. They assert "input I aligns with type A and complies with policies PAY-001/002" BEFORE any computation. If they fail, the CE should never run at all — the L1 gate should reject the input.

But mechanically, the runtime can't tell which step is a precondition and which is compute. The L1 audit-gate API takes a list of rule strings (`p: Seq(𝕊)`); we can't feed it "Validate Estimate Against Damage" alongside "Apply policy limits" without losing semantics.

**The split:**

- **P_pre** — predicates evaluated on I BEFORE F runs. L1 reads these.
- **P_post** — predicates evaluated on O AFTER F runs. L2 reads these.
- **F** — pure compute. NO validation verbs ("validate", "verify", "match against"). F transforms; it does not check.

After the split, the workbenchiq-05 contract has:

- **P_pre** carries "input must align with damage_assessment schema" + "PAY-001/002 policies must be loadable" + "liability_assessment.determination ≠ DISPUTED".
- **F** carries the four pure compute steps (inflation flag, fault adjust, variance compute, final payout formula).
- **P_post** carries the original "P:" rules (recommended_payout ≤ original_estimate, etc.) — now correctly labeled.

This split is the precondition for mechanical extraction of L1/L2/CE prompts.

---

## §3 The five mandatory blocks

```
# {stage-slug}

**Contract:** `{stage_slug}: A → B | P_pre ⊕ P_post`

## A: Input
  <YAML schema>

## P_pre: Preconditions
  ### Type Alignment
    - <rule>
  ### Format Validation
    - <rule>
  ### Regulation/Compliance Gates
    - <rule>

## F: Processing Logic
  <numbered steps — pure compute only>

## B: Output
  <YAML schema>

## P_post: Postconditions
  ### Correctness
    - <invariant>
  ### Gates
    - <pipeline-halt rule>
  ### SPT Compliance
    - <no-overclaim rule>

## Circus Executor
  <metadata block — see §5>
```

All five top-level blocks are MANDATORY. Subgroup headings inside P_pre and P_post are mandatory (they drive runtime flattening — see §6).

---

## §4 Block-by-block authoring rules

### §4.1 A — input type/schema

YAML schema describing the shape of incoming data. Use this style:

```yaml
repair_estimate:      object            # { amount: decimal, line_items: array[{ description, cost }] }
damage_assessment:    object            # Result from Stage 02 (severity, repair_range, etc.)
liability_assessment: object            # Result from Stage 03 (fault_pct, determination, etc.)
```

Or fully nested form:

```yaml
repair_estimate:
  amount: decimal
  line_items:
    - description: string
      cost: decimal
damage_assessment:
  severity: enum             # MINOR | MODERATE | SEVERE | TOTAL_LOSS
  estimated_repair_range:
    min: decimal
    max: decimal
  is_total_loss: bool
liability_assessment:
  determination: enum        # CLEAR | SHARED | DISPUTED
  insured_fault_pct: int     # 0-100
  other_party_fault_pct: int # 0-100
```

**Rules:**

- ⊢ Must be parseable YAML.
- ⊢ Use `enum`, `decimal`, `int`, `bool`, `string`, `array[...]`, `object`, `null` as primitive labels.
- ⊢ Inline `# comments` allowed and encouraged.
- ⊢ Nested types fine — depth ≤ 4 for readability.
- ⊢ One top-level field per logical input concept. If the field's shape is complex, expand it inline.

---

### §4.2 P_pre — preconditions

Predicates evaluated on I BEFORE F runs. **MUST** be grouped under these three subheadings, in this order:

```markdown
## P_pre: Preconditions

### Type Alignment
- <bullets>

### Format Validation
- <bullets>

### Regulation/Compliance Gates
- <bullets>
```

**What goes where:**

- **Type Alignment** — rules about whether I matches A's shape. Examples:
  - `repair_estimate.amount must be a decimal > 0`
  - `damage_assessment.severity must be one of {MINOR, MODERATE, SEVERE, TOTAL_LOSS}`
  - `repair_estimate.line_items must be a non-empty array`
- **Format Validation** — rules about field values within bounds, not type. Examples:
  - `repair_estimate.amount ≤ $1,000,000 (sanity cap to catch data-entry errors)`
  - `damage_assessment.estimated_repair_range.min ≤ damage_assessment.estimated_repair_range.max`
  - `liability_assessment.insured_fault_pct + liability_assessment.other_party_fault_pct == 100`
- **Regulation/Compliance Gates** — rules referencing external policies or pipeline-state. Examples:
  - `PAY-001 (payout calculation methodology) policy reference must be loadable`
  - `liability_assessment.determination ≠ "DISPUTED" (Gate G4 — pipeline halts on dispute)`
  - `Solvency-II Article 132 — internal model approval valid at runtime`

**Authoring rules:**

- ⊢ Each bullet is declarative ("must …" / "≠ …" / "non-empty"). No verbs like "validate" or "check" — the predicate IS the validation.
- ⊢ Reference policy IDs explicitly when the predicate cites a policy. `(Gate Gn)` annotations allowed when the rule corresponds to a pipeline gate.
- ⊢ Vacuous group: leave the subheading present with `(none)` rather than dropping it. Runtime expects all three subheadings.
- ⊢ If a precondition can't be expressed as a single sentence, split it.

---

### §4.3 F — processing logic

Numbered steps describing the TRANSFORMATION. **No validation, no format checks, no "validate/verify/match against" verbs.** F is pure compute.

```markdown
## F: Processing Logic

1. **Check Estimate Inflation** — Flag line items or costs exceeding typical
   ranges for damage severity, per PAY-002 (adjustment rules).
2. **Adjust for Fault Percentage** — Multiply recommended_payout by
   (other_party_fault_pct / 100) if liability_assessment.determination == "SHARED".
3. **Compute Variance** — variance := abs(original_estimate -
   damage_assessment.estimated_repair_range.max) / damage_assessment.estimated_repair_range.max.
   Set requires_independent_appraisal = (variance > 0.20).
4. **Calculate Recommended Payout** — Apply policy limits, deductibles, and
   adjustments from PAY-001. recommended_payout = min(adjusted_amount, policy_limit).
```

**Authoring rules:**

- ⊢ F describes the COMPUTATION that produces B from I. Nothing else.
- ⊢ Reference data sources cited inline (policy IDs, table lookups). The runtime loads these from a policy/reference DB and feeds them to the CE alongside I.
- ⊢ If a step reads as "Validate X" or "Check that Y is true" — it's a precondition, MOVE IT TO P_pre.
- ⊢ If a step reads as "Verify the output meets Z" — it's a postcondition, MOVE IT TO P_post.
- ⊢ F may reference intermediate variables (`variance := ...`) for clarity. CE prompt will keep these.

---

### §4.4 B — output type/schema

Mirrors A's YAML style. Describes the structured output the CE produces.

```yaml
estimate_status:                enum         # approved | adjusted | requires_review
original_estimate:              decimal      # repair_estimate.amount from input
recommended_payout:             decimal      # final calculated payout amount
adjustments:                    array[object] # [{ item, original, adjusted, reason }]
requires_independent_appraisal: bool         # true if variance > 0.20
policy_citations:               array[string] # references to applied policies
```

**Rules:**

- ⊢ Same primitive labels as A.
- ⊢ Every field the CE must produce, listed here. Optional fields use `T?` notation.
- ⊢ Inline comments documenting the field's meaning are encouraged.
- ⊢ B is the contract the L2 gate enforces. Anything the CE produces but isn't listed in B is unverifiable.

---

### §4.5 P_post — postconditions

Predicates evaluated on O AFTER F runs. **MUST** be grouped under these three subheadings:

```markdown
## P_post: Postconditions

### Correctness
- <invariant>

### Gates
- <pipeline-halt rule>

### SPT Compliance
- <no-overclaim rule>
```

**What goes where:**

- **Correctness** — invariants that must hold on O. Examples:
  - `recommended_payout ≤ original_estimate (no payout inflation)`
  - `recommended_payout ≤ policy_limits (from claim data)`
  - `amount_debited == amount_credited (conservation of money)`
  - `len(policy_citations) ≥ 1`
- **Gates** — rules that halt or route the pipeline based on O. Examples:
  - `estimate_status == "approved" required for auto-approval pathway; "adjusted" or "requires_review" routes to adjuster`
  - `requires_independent_appraisal == true if variance > 0.20`
- **SPT Compliance** — the three universal anti-overclaim predicates:
  - `No Local→Global: decision applies to this claim only, not all similar claims`
  - `No State→Trait: adjustment reflects this estimate's accuracy, not the repair shop's general reliability`
  - `No Δe→∫de: this calculation is for this claim, not predictive for future claims`

**Authoring rules:**

- ⊢ Same declarative style as P_pre.
- ⊢ Every rule must be machine-evaluable from O alone (plus B's type info). If a rule needs to reach back to I, it's NOT a postcondition — re-think the contract.
- ⊢ All three SPT bullets MUST be present in every llm-assisted contract. Deterministic contracts may omit SPT if no LLM involvement.

---

## §5 Circus Executor — stage metadata block

Required at the END of every contract:

```markdown
## Circus Executor

**stage_type:** {deterministic | hybrid | llm-assisted}
**agent_role:** {slug-like-this-agent}
**routing_priority:** {high | medium | low}
**trust_gate_L1:** {0-100} // <company-policy comment — required>
**trust_gate_L2:** {0-100} // <company-policy comment — required>
```

**Field semantics:**

- **stage_type** — what kind of execution this contract describes.
  - `deterministic`: F is pure arithmetic/lookup; no LLM needed.
  - `hybrid`: F mixes deterministic compute with LLM judgment.
  - `llm-assisted`: F requires an LLM (CE) to interpret the steps.
- **agent_role** — the kebab-case slug that identifies the CE instance for routing. Pattern: `{stage-slug}-agent` (e.g. `payout-calculation-agent`).
- **routing_priority** — workflow scheduler hint. `high` = run on dedicated CE worker; `medium` / `low` = shared pool.
- **trust_gate_L1** — the integer threshold `T` the runtime passes to the L1 audit-gate API. L1 returns ALLOW only if `score ≥ T`.
- **trust_gate_L2** — same for L2.

**Trust-gate rules:**

- ⊢ **Both gates MUST have inline comments explaining the company-policy rationale.** Bare numbers without comments are an anti-pattern (see §8).
- ⊢ Values are **company policy** decisions. This guide does NOT prescribe defaults. Common patterns:
  - Deterministic stages often run high (≥ 90) because the CE is just arithmetic.
  - Llm-assisted stages affecting money / safety / regulated decisions often run higher (≥ 85) on L2.
  - L1 thresholds are typically lower than L2 (input gates check structural alignment; output gates check semantic correctness — more rigor needed).
- ⊢ The comment MUST cite the policy basis: company governance document, regulatory minimum, internal risk tier, etc.

**Examples:**

```markdown
**trust_gate_L1:** 70 // company policy: pre-checks are structural — moderate threshold per InsClaims-PolicyDoc §4.2
**trust_gate_L2:** 85 // company policy: payout-affecting outputs require high confidence per WorkbenchIQ governance standard
```

---

## §6 How runtime consumes the contract

Runtime — the Wolfi orchestrator + the audit-gate proxy — mechanically extracts three prompt payloads from each contract file at execution time.

### §6.1 L1 P-check call

```
POST /api/audit-gate/p-check
{
  "i":              <I serialized as JSON>,
  "a":              <A YAML schema serialized as JSON object>,
  "p":              <P_pre flattened — see flatten rule below>,
  "t":              <Circus Executor trust_gate_L1>,
  "session_context": "<workflow-slug>:<stage-slug>",
  "provider":       "gemini" | "claude" | "openai",
  "gem2_api_key":   "...",
  "*_api_key":      "..."
}
```

**Flatten rule for P_pre:**

```
For each subgroup in [Type Alignment, Format Validation, Regulation/Compliance Gates]:
  For each bullet under that subgroup:
    emit  "[<Subgroup>] <bullet text>"
Combine all emitted strings into a single Seq(𝕊).
```

Example output for workbenchiq-05's P_pre:

```json
"p": [
  "[Type Alignment] repair_estimate.amount must be a decimal > 0",
  "[Type Alignment] repair_estimate.line_items must be a non-empty array",
  "[Type Alignment] damage_assessment.estimated_repair_range present with {min, max} decimals",
  "[Format Validation] repair_estimate.amount ≤ $1,000,000 (sanity cap)",
  "[Regulation/Compliance Gates] PAY-001 policy reference loadable",
  "[Regulation/Compliance Gates] liability_assessment.determination ≠ 'DISPUTED' (Gate G4)"
]
```

**Decision (caller side):** `verdict == "ALLOW" ∧ score ≥ t → GO`; else STOP.

### §6.2 CE call

```
POST https://api.vultrinference.com/v1/chat/completions
{
  "model":           "<vultr/model-name from sheep_registry>",
  "messages": [
    { "role": "system", "content": "<system prompt with F embedded>" },
    { "role": "user",   "content": "<I + reference_data>" }
  ],
  "temperature":     0.1,
  "response_format": { "type": "json_object" }
}
```

The system prompt embeds:
- The full **F** block verbatim (numbered steps preserved).
- **B** schema as the expected output structure (Vultr structured-output mode enforces this).
- **reference_data** — policy text loaded from the policy DB for every policy ID cited in F + P_pre + P_post.

**No validation prompts.** The CE's job is to RUN F on I. Validation is L1/L2's job.

### §6.3 L2 O-check call

```
POST /api/audit-gate/o-check
{
  "o":              <O from CE serialized as JSON>,
  "b":              <B YAML schema serialized as JSON object>,
  "p":              <P_post flattened — same rule as §6.1>,
  "t":              <Circus Executor trust_gate_L2>,
  ...same auxiliary fields as L1...
}
```

**Flatten rule for P_post** (same as P_pre but iterating over `[Correctness, Gates, SPT Compliance]`):

```json
"p": [
  "[Correctness] recommended_payout ≤ original_estimate (no payout inflation)",
  "[Correctness] At least one policy_citations entry exists",
  "[Gates] estimate_status == 'approved' before auto-approval pathway",
  "[SPT Compliance] No Local→Global: decision specific to this claim",
  "[SPT Compliance] No State→Trait: adjustments reflect this estimate's accuracy",
  "[SPT Compliance] No Δe→∫de: applies to this claim only"
]
```

**Decision:** `verdict == "SUCCESS" ∧ score ≥ t → advance to next stage`; else STOP and route to error handler.

---

## §7 Worked example — workbenchiq-05 BEFORE / AFTER

Full refactored exemplar lives at: [`Docs/workbenchiq-05-payout-calculation-refactored.md`](workbenchiq-05-payout-calculation-refactored.md)

**Key diff in the F block:**

```diff
 ## F: Processing Logic

-1. **Validate Estimate Against Damage** — Cross-check repair_estimate.amount
-   against damage_assessment.estimated_repair_range
-2. **Apply Payout Policies** — Match against PAY-001 and PAY-002
-3. **Check Estimate Inflation** — Flag excessive line items...
-4. **Adjust for Fault Percentage** — Multiply payout by fault_pct/100...
-5. **Flag Independent Appraisal** — Require if variance > 20%
-6. **Calculate Recommended Payout** — Apply policy limits...
+1. **Check Estimate Inflation** — Flag line items exceeding typical ranges...
+2. **Adjust for Fault Percentage** — Multiply by (other_party_fault_pct/100)...
+3. **Compute Variance** — variance := abs(orig - damage.max)/damage.max;
+   set requires_independent_appraisal = (variance > 0.20)
+4. **Calculate Recommended Payout** — Apply PAY-001 policy limits...
```

What moved:

| Original F step | Moved to | Subgroup |
|---|---|---|
| Step 1 "Validate Estimate Against Damage" | P_pre | Type Alignment |
| Step 2 "Apply Payout Policies" (matching) | P_pre | Regulation/Compliance Gates |
| Steps 3-6 (compute) | F (now Steps 1-4) | — |

What stayed in F: Step 5 ("Flag Independent Appraisal" → renamed "Compute Variance") — this is COMPUTE that produces a B field (`requires_independent_appraisal`), not validation. It belongs in F.

---

## §8 Anti-patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| ❌ Validation step inside F ("Validate X holds") | Runtime cannot mechanically split it from compute → L1 gate runs blind | Move to P_pre as a declarative rule |
| ❌ Postcondition that reads like a precondition ("input must be > 0" in P_post) | L2 runs after F — it can't reject input | Move to P_pre |
| ❌ Implicit reference data ("apply policy X" without citing the ID) | Runtime can't load the policy text for the CE | Cite policy ID explicitly: `(per PAY-001)` |
| ❌ Trust gate without comment (`trust_gate_L2: 85`) | No company-policy rationale → future authors / auditors can't justify or revise | Always add `// <reason>` inline |
| ❌ F that returns "approved/rejected" decisions | Decision-making belongs in B + L2 gate; F's job is to COMPUTE the decision payload, not to decide | Have F produce `estimate_status: enum` in B; let L2 + downstream stages enforce routing |
| ❌ Subjective P_post rule ("output should be reasonable") | Not machine-evaluable → L2 cannot score | Rewrite as a measurable predicate (`recommended_payout ≤ policy_limit`) |
| ❌ Vacuous subgroup ("none" deleted) | Runtime expects three subheadings under P_pre and P_post | Keep the subheading, write `(none)` if truly empty |
| ❌ B field that F doesn't produce | L2 will fail every time — schema mismatch | Either F produces it or B doesn't list it |
| ❌ A field that F doesn't read | Dead input — bloats CE prompt | Drop from A, or document why it's reserved |

---

## §9 Authoring checklist (single page)

Tick every box before merging a contract.

```
A (input)
[ ] Parseable YAML
[ ] One top-level field per logical input concept
[ ] Inline comments documenting non-obvious fields

P_pre (preconditions)
[ ] Three subheadings present: Type Alignment / Format Validation / Regulation/Compliance Gates
[ ] All bullets declarative ("must …" / "≠ …") — no validation verbs
[ ] Policy IDs cited explicitly where referenced
[ ] Pipeline gates annotated with `(Gate Gn)` when applicable
[ ] Vacuous subgroup → `(none)` not deleted

F (processing logic)
[ ] Numbered steps
[ ] No "validate" / "verify" / "check that X holds" verbs
[ ] Reference data sources cited inline (policy IDs / DB tables)
[ ] Pure compute — produces fields listed in B

B (output)
[ ] Mirrors A's YAML style
[ ] Every field F produces is listed; nothing F doesn't produce
[ ] Inline comments documenting field meaning
[ ] Enum values explicitly enumerated

P_post (postconditions)
[ ] Three subheadings present: Correctness / Gates / SPT Compliance
[ ] Every rule machine-evaluable from O alone (no reach-back to I)
[ ] All three SPT bullets present (for llm-assisted contracts)
[ ] Conservation laws / invariants in Correctness
[ ] Pipeline-routing rules in Gates

Circus Executor
[ ] stage_type set (deterministic / hybrid / llm-assisted)
[ ] agent_role kebab-case slug
[ ] routing_priority set
[ ] trust_gate_L1 has integer + inline comment with company-policy rationale
[ ] trust_gate_L2 has integer + inline comment with company-policy rationale

Anti-patterns scan
[ ] No semantic checks in F
[ ] No P_post rule that reads as precondition
[ ] No bare trust-gate numbers
[ ] No subjective ("should be reasonable") rules
[ ] No B field without F producing it
```

---

*Authoring guide v1.0 | AI Agent Olympics | GEM².AI — 2026-05-16*
