# purchase-order-mgmt

**Workflow:** Procurement & Vendor Onboarding  
**Domain:** Operations  
**Contract:** `purchase-order-mgmt: A → B | P`

---

## A: Input

```yaml
vendor_id:          string
contract_id:        string    # from approved contract
requester_id:       string    # employee requesting purchase
department:         string
items:              object[]
  - item_id:        string
    description:    string
    category:       enum      # {goods, service, license, subscription}
    unit_price:     number
    quantity:       number
    delivery_date:  date      # requested delivery
budget:             object
  department_budget: number   # remaining annual budget (USD)
  project_budget:   number?   # project-specific budget if applicable
  cost_center:      string
approval_policy:    object
  auto_approve_limit: number  # PO auto-approved if under this amount
  levels:           object[]  # approval chain
    - threshold:    number    # up to this amount
      approver_role: string   # e.g., "manager", "director", "vp"
```

## F: Processing Logic

1. **Line item validation** — For each item:
   - `unit_price > 0` and `quantity > 0`
   - `delivery_date ≥ today() + 1` (minimum 1 day lead)
   - `category` is valid enum
   - Calculate `line_total = unit_price × quantity`
2. **Total calculation** — `po_total = sum(line_totals)`
3. **Budget check:**
   - `within_department_budget = po_total ≤ budget.department_budget`
   - If `project_budget` exists: `within_project_budget = po_total ≤ budget.project_budget`
   - `within_budget = within_department_budget ∧ within_project_budget`
4. **Approval chain determination** — Based on `po_total` and `approval_policy`:
   - `po_total ≤ auto_approve_limit` → no approval needed
   - Otherwise, find all `levels` where `po_total > threshold` → build approval chain
   - E.g., $15K PO: manager (up to $5K) + director (up to $25K) → both approve
5. **Contract alignment** — Verify PO items are within contract scope:
   - Items match `contract.type` (can't order goods on a service contract)
   - `po_total` does not push cumulative spend past `contract.value`
6. **PO number generation** — Format: `PO-{YYYY}-{department}-{sequence}`

## B: Output

```yaml
po_id:              string    # generated PO number
vendor_id:          string
contract_id:        string
requester_id:       string
line_items:         object[]
  - item_id:        string
    description:    string
    unit_price:     number
    quantity:       number
    line_total:     number
    delivery_date:  date
total:              number    # sum of all line_totals
within_budget:      bool
budget_remaining:   number    # department budget after this PO
approval_chain:     object[]
  - approver_role:  string
    required:       bool      # needs sign-off
    status:         enum      # {pending, approved, rejected}
contract_headroom:  number    # remaining contract value after this PO
po_status:          enum      # {draft, pending_approval, approved, rejected}
created_timestamp:  datetime
```

## P: Postcondition Checklist

- [ ] `po_id` is non-empty, follows format `PO-YYYY-{dept}-{seq}`
- [ ] `vendor_id` in B matches A
- [ ] `contract_id` in B matches A
- [ ] `requester_id` in B matches A
- [ ] `len(line_items) = len(items)` from A (all items carried through)
- [ ] Each `line_items[i].line_total = unit_price × quantity` (arithmetic correctness)
- [ ] `total = sum(line_items[].line_total)` (sum correctness)
- [ ] `within_budget` correctly reflects `total ≤ department_budget` (and project budget if present)
- [ ] `budget_remaining = department_budget - total`
- [ ] `budget_remaining ≥ 0` if `within_budget = true`
- [ ] If `total ≤ auto_approve_limit` → `approval_chain` is empty or all `status = approved`
- [ ] If `total > auto_approve_limit` → `approval_chain` is non-empty
- [ ] `contract_headroom ≥ 0` (PO does not exceed contract value)
- [ ] `po_status` ∈ `{draft, pending_approval, approved, rejected}`
- [ ] `po_status = approved` ⟹ all `approval_chain[].status = approved`
- [ ] `po_status = rejected` ⟹ at least one `approval_chain[].status = rejected`
- [ ] `created_timestamp` is valid ISO 8601, not future-dated
- [ ] Each `delivery_date ≥ today()` (no past dates)
