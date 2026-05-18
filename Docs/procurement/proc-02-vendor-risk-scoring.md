# vendor-risk-scoring

**Workflow:** Procurement & Vendor Onboarding  
**Domain:** Operations  
**Contract:** `vendor-risk-scoring: A → B | P`

---

## A: Input

```yaml
vendor_id:          string    # from vendor-intake
vendor_name:        string
financial_stmt:     object
  annual_revenue:   number
  net_income:       number
  fiscal_year_end:  date
  audited:          bool
certifications:     object[]
  - cert_type:      string
    valid_until:    date
references:         object[]
  - company_name:   string
    relationship:   string
country:            string
business_type:      enum
years_in_business:  number
employee_count:     number
previous_contracts: object[]? # existing contracts with us (if renewal)
  - contract_id:    string
    start_date:     date
    value:          number
    performance_score: number  # [0, 100]
```

## F: Processing Logic

1. **Financial health score** [0, 30] — Weighted sub-scores:
   - Profit margin: `net_income / annual_revenue`
     - `> 15%` → 10 pts, `5-15%` → 7 pts, `0-5%` → 4 pts, `< 0` → 0 pts
   - Revenue stability: `annual_revenue > $1M` → 5 pts, `> $100K` → 3 pts, else 1 pt
   - Audited financials: `audited = true` → 10 pts, else 3 pts
   - Years in business: `> 10` → 5 pts, `5-10` → 3 pts, `< 5` → 1 pt
2. **Compliance score** [0, 30] — Based on certifications:
   - ISO 27001 (information security) → 10 pts
   - SOC 2 Type II (service controls) → 10 pts
   - GDPR DPA (data processing) → 5 pts
   - Industry-specific certs → 5 pts each (cap at 10)
   - Deduct 5 pts per expired certification
3. **Operational score** [0, 20] — Based on capacity:
   - Employee count vs. contract scope → adequacy assessment
   - Reference quality: 3+ references → 10 pts, 2 → 5 pts, <2 → 0
   - Geographic risk: country risk tier (low/medium/high) → 10/5/0 pts
4. **Performance score** [0, 20] — From historical data:
   - If `previous_contracts` exist: average `performance_score`
   - If new vendor: default 10 (neutral)
5. **Aggregate risk score** — `risk_score = financial + compliance + operational + performance` [0, 100]
6. **Tier assignment:**
   - Preferred: risk_score ≥ 75
   - Standard: 50 ≤ risk_score < 75
   - Probation: risk_score < 50
7. **Risk factor identification** — List top 3 contributing risks.

## B: Output

```yaml
vendor_id:          string
risk_score:         number    # [0, 100]
risk_tier:          enum      # {preferred, standard, probation}
score_breakdown:    object
  financial:        number    # [0, 30]
  compliance:       number    # [0, 30]
  operational:      number    # [0, 20]
  performance:      number    # [0, 20]
risk_factors:       object[]
  - factor:         string    # e.g., "Unaudited financials"
    impact:         enum      # {high, medium, low}
    category:       string    # {financial, compliance, operational, performance}
financial_health:   enum      # {strong, adequate, weak, critical}
recommendations:    string[]  # mitigation recommendations
scoring_timestamp:  datetime
```

## P: Postcondition Checklist

- [ ] `vendor_id` in B matches A
- [ ] `risk_score` ∈ `[0, 100]`
- [ ] `risk_score = score_breakdown.financial + compliance + operational + performance`
- [ ] `score_breakdown.financial` ∈ `[0, 30]`
- [ ] `score_breakdown.compliance` ∈ `[0, 30]`
- [ ] `score_breakdown.operational` ∈ `[0, 20]`
- [ ] `score_breakdown.performance` ∈ `[0, 20]`
- [ ] `risk_tier` is consistent with `risk_score` (preferred ≥ 75, standard ≥ 50, probation < 50)
- [ ] `risk_factors` has ≥ 1 entry (always at least one factor identified)
- [ ] Each `risk_factors[].impact` ∈ `{high, medium, low}`
- [ ] Each `risk_factors[].category` ∈ `{financial, compliance, operational, performance}`
- [ ] `financial_health` ∈ `{strong, adequate, weak, critical}`
- [ ] `financial_health` is consistent with `score_breakdown.financial` (strong ≥ 25, critical < 10)
- [ ] `recommendations` is non-empty if `risk_tier = probation`
- [ ] `scoring_timestamp` is valid ISO 8601, not future-dated
- [ ] No S→T: risk score characterizes the vendor's current state, not permanent nature
- [ ] No Δe→∫de: single vendor score not used to predict entire supplier category
