# contract-review

**Workflow:** Procurement & Vendor Onboarding  
**Domain:** Operations  
**Contract:** `contract-review: A → B | P`

---

## A: Input

```yaml
vendor_id:          string
vendor_name:        string
risk_tier:          enum      # {preferred, standard, probation}
risk_score:         number    # [0, 100]
draft_contract:     object
  title:            string
  type:             enum      # {service, supply, license, consulting, maintenance}
  value:            number    # total contract value (USD)
  duration_months:  number
  auto_renew:       bool
  payment_terms:    string    # e.g., "Net 30", "Net 60"
  liability_cap:    number?   # maximum liability (USD, nullable = uncapped)
  termination_clause: string  # termination conditions
  sla_terms:        object[]?
    - metric:       string    # e.g., "uptime", "response_time"
      target:       string    # e.g., "99.9%", "<4 hours"
      penalty:      string?   # e.g., "5% credit per 0.1% below target"
  ip_ownership:     string    # who owns work product
  data_handling:    string    # data processing terms
  insurance_required: object?
    general:        number
    professional:   number?
    cyber:          number?
procurement_policy: object    # internal policy constraints
  max_value_no_approval: number  # threshold for auto-approval
  required_sla:     bool       # SLA required for service contracts?
  liability_cap_required: bool
  min_insurance_general: number
```

## F: Processing Logic

1. **Value threshold check** — If `draft_contract.value > procurement_policy.max_value_no_approval`, flag for executive approval.
2. **Liability cap review:**
   - If `liability_cap` is null (uncapped) → `critical` issue. Recommend cap at 2x contract value.
   - If `liability_cap < contract value` → `warning`. Industry standard: 1x-3x.
   - If `liability_cap_required = true` and cap is null → `critical`.
3. **SLA completeness:**
   - If `type = service` and `procurement_policy.required_sla = true`:
     - Check `sla_terms` is non-empty
     - Check each SLA has `metric`, `target`, and `penalty`
     - Missing SLA for service contract → `critical`
   - Verify SLA targets are measurable (not vague like "best effort")
4. **Insurance adequacy:**
   - Compare `insurance_required` against `procurement_policy.min_insurance_general`
   - If general liability < minimum → `warning`
   - If cyber liability missing for IT vendors → `warning`
5. **Termination clause review:**
   - Check for convenience termination (can either party exit?)
   - Check notice period (should be ≥ 30 days)
   - Flag if only vendor can terminate
6. **IP ownership check:**
   - Work-for-hire: buyer should own deliverables
   - License: verify license scope matches needs
   - Flag ambiguous ownership language
7. **Data handling review:**
   - If vendor processes personal data: GDPR/CCPA compliance language required
   - Data deletion on termination clause required
   - Subprocessor disclosure required
8. **Risk-adjusted review** — Probation-tier vendors get stricter scrutiny:
   - Shorter term (max 12 months for probation)
   - Lower liability threshold
   - More frequent performance reviews

## B: Output

```yaml
vendor_id:          string
approved:           bool      # ready for signing
requires_executive: bool      # exceeds auto-approval threshold
issues:             object[]
  - clause:         string    # which contract section
    severity:       enum      # {critical, warning, info}
    finding:        string    # what's wrong
    recommendation: string    # suggested fix
    regulation:     string?   # applicable regulation if any
liability_flags:    string[]  # liability-specific concerns
sla_adequate:       bool      # SLA terms meet policy requirements
ip_clear:           bool      # IP ownership is unambiguous
data_compliant:     bool      # data handling meets requirements
risk_adjusted_terms: object?  # recommended changes for probation vendors
  max_duration:     number?   # months
  review_frequency: string?   # e.g., "quarterly"
audit_trail:        object
  clauses_reviewed: number
  issues_found:     number
  timestamp:        datetime
```

## P: Postcondition Checklist

- [ ] `vendor_id` in B matches A
- [ ] `approved` is boolean
- [ ] `approved = true` ⟹ no issues with `severity = critical`
- [ ] `approved = false` ⟹ at least one issue with `severity ∈ {critical, warning}`
- [ ] `requires_executive = true` ⟹ `draft_contract.value > procurement_policy.max_value_no_approval`
- [ ] Each issue has non-empty `clause`, `severity`, `finding`, `recommendation`
- [ ] `severity` ∈ `{critical, warning, info}` for all issues
- [ ] If `liability_cap` is null in A → at least one issue mentions uncapped liability
- [ ] If `type = service` and `required_sla = true` and no SLA → issue present
- [ ] `sla_adequate = true` ⟹ all SLA terms have metric + target + penalty
- [ ] `ip_clear = true` ⟹ IP ownership is explicitly assigned (not ambiguous)
- [ ] `data_compliant = true` ⟹ data handling clause addresses deletion + subprocessors
- [ ] If `risk_tier = probation` → `risk_adjusted_terms` is non-null
- [ ] `audit_trail.clauses_reviewed ≥ 6` (liability, SLA, IP, data, termination, insurance minimum)
- [ ] `audit_trail.issues_found = len(issues)`
- [ ] `audit_trail.timestamp` is valid ISO 8601, not future-dated
- [ ] No L→G: findings are specific to this contract, not generalized to all vendor contracts
