# compliance-check

**Workflow:** Loan Approval Pipeline  
**Domain:** Financial Services  
**Contract:** `compliance-check: A → B | P`

---

## A: Input

```yaml
applicant_id:       string
credit_score:       number    # from credit-scoring
risk_tier:          enum      # {A, B, C, D}
loan_amount:        number
loan_purpose:       enum      # {mortgage, auto, personal, business, education}
loan_type:          enum      # {secured, unsecured}
income_annual:      number
debt_ratio:         number
applicant_demographics:  object
  age:              number
  state:            string    # US state code
  military_status:  bool
```

## F: Processing Logic

1. **Fair lending check** — Verify no prohibited factors used in prior scoring (race, religion, national origin, sex, marital status). Flag if demographic data was input to credit-scoring beyond permitted fields.
2. **Usury limit check** — Look up state-specific interest rate caps for `applicant_demographics.state` and `loan_type`. Flag if projected rate would exceed cap.
3. **Military lending check** — If `military_status = true`, verify MAPR ≤ 36% (Military Lending Act). Flag if loan terms would violate.
4. **TILA disclosure readiness** — Verify all fields needed for Truth-in-Lending disclosure are present: APR, finance charge, amount financed, total of payments.
5. **ECOA adverse action** — If loan will be denied (risk_tier D), verify adverse action notice components are preparable from available data.
6. **SPT flag scan** — Run gem2-TPMN-checker on any AI-generated text in the pipeline:
   - L→G: "applicants like this always default" (local data → global claim)
   - S→T: "this applicant is a high-risk borrower" (state → trait)
   - Δe→∫de: "this zip code will see 20% default rates" (sample → population)
7. **Aggregate compliance verdict** — `compliant = no_fair_lending_violations ∧ no_usury_violation ∧ no_MLA_violation ∧ TILA_ready ∧ no_SPT_flags`

## B: Output

```yaml
applicant_id:       string
compliant:          bool      # overall compliance verdict
regulatory_checks:  object[]  # one entry per check performed
  - check_name:     string    # e.g., "fair_lending", "usury_limit"
    status:         enum      # {pass, fail, warning}
    detail:         string    # explanation
    regulation:     string    # e.g., "ECOA", "TILA", "MLA"
flags:              string[]  # SPT/EEF flags detected
audit_trail:        object
  checks_performed: number
  checks_passed:    number
  checks_failed:    number
  timestamp:        datetime
  reviewer:         string    # "gem2-tpmn-checker-v0.5.2"
```

## P: Postcondition Checklist

- [ ] `applicant_id` in B matches A
- [ ] `compliant` is boolean
- [ ] `compliant = true` ⟹ all `regulatory_checks[].status ∈ {pass, warning}` (no fails)
- [ ] `compliant = false` ⟹ at least one `regulatory_checks[].status = fail`
- [ ] Every check in `regulatory_checks` has non-empty `regulation` reference
- [ ] `flags ⊂ {SPT_L→G, SPT_S→T, SPT_Δe→∫de, EEF}` (valid flag enum)
- [ ] `audit_trail.checks_performed = len(regulatory_checks)`
- [ ] `audit_trail.checks_passed + checks_failed = checks_performed`
- [ ] `audit_trail.timestamp` is valid ISO 8601, not future-dated
- [ ] `audit_trail.reviewer` identifies the verification engine and version
- [ ] No fair lending check references prohibited demographic factors
- [ ] If `military_status = true` → MLA check is present in `regulatory_checks`
- [ ] If `risk_tier = D` → ECOA adverse action check is present
