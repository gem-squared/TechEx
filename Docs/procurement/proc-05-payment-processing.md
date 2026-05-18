# payment-processing

**Workflow:** Procurement & Vendor Onboarding  
**Domain:** Operations  
**Contract:** `payment-processing: A → B | P`

---

## A: Input

```yaml
po_id:              string    # from purchase-order-mgmt
vendor_id:          string
contract_id:        string
invoice:            object
  invoice_id:       string    # vendor's invoice number
  invoice_date:     date
  invoice_amount:   number
  line_items:       object[]
    - description:  string
      amount:       number
  payment_terms:    string    # e.g., "Net 30"
  bank_details:     object
    bank_name:      string
    routing_number: string
    account_number: string
delivery_confirmed: bool      # goods/services received?
po_total:           number    # original PO amount
po_line_items:      object[]  # original PO items for matching
three_way_match:    object    # PO vs receipt vs invoice
  po_match:         bool      # invoice matches PO
  receipt_match:    bool      # invoice matches delivery receipt
  variance_pct:     number    # % difference if mismatch
```

## F: Processing Logic

1. **Invoice validation:**
   - `invoice_amount > 0`
   - `invoice_date ≤ today()` (not future-dated)
   - `invoice_id` is non-empty, unique (not previously processed)
   - Line items sum matches `invoice_amount`
2. **Three-way match verification:**
   - PO match: `invoice_amount ≈ po_total` (within tolerance)
   - Receipt match: `delivery_confirmed = true`
   - Variance tolerance: ≤ 5% difference is auto-approved, 5-10% → warning, >10% → hold
3. **Duplicate invoice detection:**
   - Check `invoice_id` + `vendor_id` against processed invoices
   - Check for same `invoice_amount` + `invoice_date` within 30-day window
   - Flag potential duplicates
4. **Payment term calculation:**
   - Parse `payment_terms` (e.g., "Net 30" → 30 days from invoice_date)
   - `payment_due_date = invoice_date + term_days`
   - Early payment discount: if "2/10 Net 30" → 2% discount if paid within 10 days
5. **Payment scheduling:**
   - If all checks pass: `status = scheduled`, `scheduled_date = payment_due_date`
   - If delivery not confirmed: `status = held`, reason = "awaiting delivery confirmation"
   - If variance > 10% or duplicate detected: `status = held`, reason = specific issue
6. **Audit record** — Log every decision point for financial audit trail.

## B: Output

```yaml
payment_id:         string    # generated payment identifier
po_id:              string
vendor_id:          string
invoice_id:         string
amount:             number    # amount to pay (may differ from invoice if discount)
discount_applied:   number?   # early payment discount amount
status:             enum      # {scheduled, held, rejected}
hold_reasons:       string[]  # why held (empty if scheduled)
scheduled_date:     date?     # payment date (null if held/rejected)
payment_method:     enum      # {ach, wire, check}
three_way_match_result: object
  po_match:         bool
  receipt_match:    bool
  variance_pct:     number
  match_status:     enum      # {exact, within_tolerance, over_tolerance}
duplicate_risk:     bool      # potential duplicate invoice detected
audit_trail:        object
  checks_performed: string[]  # list of checks run
  decisions:        object[]
    - check:        string
      result:       enum      # {pass, warning, fail}
      detail:       string
  timestamp:        datetime
  approver:         string    # system or human who approved
```

## P: Postcondition Checklist

- [ ] `payment_id` is non-empty, unique string
- [ ] `po_id` in B matches A
- [ ] `vendor_id` in B matches A
- [ ] `invoice_id` in B matches `A.invoice.invoice_id`
- [ ] `status` ∈ `{scheduled, held, rejected}`
- [ ] `status = scheduled` ⟹ `delivery_confirmed = true` in A
- [ ] `status = scheduled` ⟹ `three_way_match_result.match_status ∈ {exact, within_tolerance}`
- [ ] `status = scheduled` ⟹ `scheduled_date` is non-null
- [ ] `status = scheduled` ⟹ `hold_reasons` is empty
- [ ] `status = held` ⟹ `hold_reasons` is non-empty
- [ ] `status = held` ⟹ `scheduled_date` is null
- [ ] `amount ≤ invoice_amount` (payment never exceeds invoice)
- [ ] If `discount_applied` > 0 → `amount = invoice_amount - discount_applied`
- [ ] If no discount → `amount = invoice_amount`
- [ ] `three_way_match_result.variance_pct` ≈ `abs(invoice_amount - po_total) / po_total * 100`
- [ ] `three_way_match_result.match_status` consistent with `variance_pct` (exact: 0%, tolerance: ≤5%, over: >5%)
- [ ] `duplicate_risk = true` ⟹ `status ∈ {held, rejected}` (duplicates never auto-scheduled)
- [ ] `audit_trail.checks_performed` ≥ 4 entries (validation, match, duplicate, scheduling)
- [ ] `audit_trail.timestamp` is valid ISO 8601, not future-dated
- [ ] Bank account number NOT present in B (security: no raw bank details in output)
