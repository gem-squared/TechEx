# response-quality-check

**Workflow:** Customer Support Escalation  
**Domain:** Customer Care  
**Contract:** `response-quality-check: A → B | P`

---

## A: Input

```yaml
ticket_id:          string
customer_id:        string
customer_message:   string    # original customer message
draft_response:     string    # AI-generated or agent-drafted response
sentiment:          enum      # from sentiment-analysis
urgency:            number    # [1..5]
intent:             enum      # customer intent
category:           string    # ticket category
policy_context:     object    # relevant policies
  refund_eligible:  bool
  warranty_active:  bool
  escalation_path:  string    # next escalation team
  sla_remaining:    duration  # time left on SLA
```

## F: Processing Logic

1. **Tone alignment check** — Evaluate if response tone matches situation:
   - `sentiment = angry` → response must be empathetic, not defensive
   - `sentiment = positive` → response can be friendly, efficient
   - Flag: condescending tone, dismissive language, excessive formality for casual channel
   - `tone_score ∈ [0, 1]`
2. **Factual accuracy check** — Verify claims in `draft_response`:
   - Refund promises → check `policy_context.refund_eligible`
   - Warranty claims → check `policy_context.warranty_active`
   - Timeline promises → check against `sla_remaining`
   - Flag any promise the system cannot fulfill
   - `accuracy_score ∈ [0, 1]`
3. **Completeness check** — Does the response address the customer's `intent`?
   - `get_refund` → response mentions refund process or explains why not
   - `cancel` → response acknowledges and provides process or retention offer
   - `get_help` → response provides actionable solution or clear next step
   - `completeness_score ∈ [0, 1]`
4. **PII/security scan** — Verify response does not expose:
   - Internal system IDs, employee names, internal ticket numbers
   - Other customers' data
   - Internal policy documents verbatim
5. **SLA compliance** — If sending this response, will it meet `sla_remaining`?
6. **Approval decision** — `approved = tone_score ≥ 0.7 ∧ accuracy_score ≥ 0.9 ∧ completeness_score ≥ 0.7 ∧ no_pii_leak ∧ sla_compliant`
7. **Revision** — If not approved, generate `revised_response` fixing identified issues.

## B: Output

```yaml
ticket_id:          string
approved:           bool
tone_score:         number    # [0, 1]
accuracy_score:     number    # [0, 1]
completeness_score: number    # [0, 1]
issues:             object[]
  - dimension:      enum      # {tone, accuracy, completeness, pii, sla}
    severity:       enum      # {critical, warning, info}
    detail:         string    # what's wrong
    location:       string?   # quote from draft_response
revised_response:   string?   # null if approved; corrected version if not
sla_compliant:      bool
audit_trail:        object
  checks_performed: number
  checks_passed:    number
  timestamp:        datetime
```

## P: Postcondition Checklist

- [ ] `ticket_id` in B matches A
- [ ] `approved` is boolean
- [ ] `approved = true` ⟹ `tone_score ≥ 0.7`
- [ ] `approved = true` ⟹ `accuracy_score ≥ 0.9`
- [ ] `approved = true` ⟹ `completeness_score ≥ 0.7`
- [ ] `approved = true` ⟹ `len(issues) = 0` or all issues severity = `info`
- [ ] `approved = false` ⟹ `len(issues) > 0` with at least one `critical` or `warning`
- [ ] `approved = false` ⟹ `revised_response` is non-null and non-empty
- [ ] `approved = true` ⟹ `revised_response` is null
- [ ] `tone_score`, `accuracy_score`, `completeness_score` all ∈ `[0, 1]`
- [ ] Each issue in `issues` has valid `dimension` enum
- [ ] If `accuracy_score < 0.9` → at least one issue with `dimension = accuracy`
- [ ] `sla_compliant` is consistent with `policy_context.sla_remaining`
- [ ] `revised_response` does not contain the same issues flagged in `issues`
- [ ] `audit_trail.checks_performed ≥ 4` (tone, accuracy, completeness, pii minimum)
- [ ] No PII in `revised_response` (internal IDs, employee names, other customer data)
