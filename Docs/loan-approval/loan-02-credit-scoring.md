# credit-scoring

**Workflow:** Loan Approval Pipeline  
**Domain:** Financial Services  
**Contract:** `credit-scoring: A → B | P`

---

## A: Input

```yaml
applicant_id:       string    # from pre-screen output
income_annual:      number    # gross annual income (USD)
loan_amount:        number    # requested amount (USD)
existing_debt:      number    # total outstanding debt (USD)
collateral_value:   number?   # appraised value if secured (nullable)
credit_history:     object    # bureau data
  accounts_open:    number    # active credit accounts
  accounts_closed:  number    # closed accounts
  missed_payments:  number    # payments >30 days late in last 24 months
  oldest_account_months: number  # age of oldest account
  utilization_pct:  number    # credit utilization ratio [0,100]
  bankruptcies:     number    # bankruptcy filings
  inquiries_6mo:    number    # hard inquiries in last 6 months
```

## F: Processing Logic

1. **Base score calculation** — Start at 600. Adjust by weighted factors:
   - `oldest_account_months > 60` → +50
   - `missed_payments = 0` → +80; per missed payment → -30
   - `utilization_pct < 30` → +40; `> 70` → -60
   - `bankruptcies > 0` → -200
   - `inquiries_6mo > 3` → -20
2. **Clamp** — `credit_score = clamp(base_score, 300, 850)`
3. **Risk tier assignment:**
   - A: credit_score ≥ 750
   - B: 650 ≤ credit_score < 750
   - C: 550 ≤ credit_score < 650
   - D: credit_score < 550
4. **Debt ratio** — `debt_ratio = existing_debt / income_annual`
5. **LTV ratio** — `ltv_ratio = loan_amount / collateral_value` (null if unsecured)
6. **Financial health summary** — Composite label: `{strong, adequate, weak, critical}` based on tier + debt_ratio combination.

## B: Output

```yaml
applicant_id:       string    # passthrough
credit_score:       number    # [300, 850]
risk_tier:          enum      # {A, B, C, D}
debt_ratio:         number    # [0, ∞) but typically [0, 2]
ltv_ratio:          number?   # null if unsecured
financial_health:   enum      # {strong, adequate, weak, critical}
score_factors:      string[]  # top contributing factors (positive and negative)
scoring_timestamp:  datetime
```

## P: Postcondition Checklist

- [ ] `applicant_id` in B matches A
- [ ] `credit_score ∈ [300, 850]` (clamped range)
- [ ] `risk_tier` is consistent with `credit_score` (A≥750, B≥650, C≥550, D<550)
- [ ] `debt_ratio = existing_debt / income_annual` (arithmetic correctness)
- [ ] `debt_ratio ≥ 0` (non-negative)
- [ ] If `collateral_value` provided → `ltv_ratio = loan_amount / collateral_value`
- [ ] If `collateral_value` null → `ltv_ratio` is null
- [ ] `financial_health` is consistent with tier + debt_ratio
- [ ] `score_factors` is non-empty array (at least 1 factor cited)
- [ ] `scoring_timestamp` is valid ISO 8601, not future-dated
- [ ] No S→T violation: score reflects current snapshot, not permanent characterization
- [ ] No Δe→∫de violation: single applicant score not extrapolated to portfolio prediction
