# resolve

**Workflow:** Customer Support Escalation  
**Domain:** Customer Care  
**Contract:** `resolve: A → B | P`

---

## A: Input

```yaml
ticket_id:          string
customer_id:        string
approved_response:  string    # from response-quality-check (approved)
category:           string
intent:             enum      # customer intent
urgency:            number    # [1..5]
churn_risk:         number    # [0, 1]
channel:            enum      # {email, chat, phone, social, in_app}
sla_resolution:     datetime  # deadline
actions_required:   object[]? # system actions to execute
  - action_type:    enum      # {issue_refund, apply_credit, reset_password, create_ticket, transfer}
    parameters:     object    # action-specific params
```

## F: Processing Logic

1. **Action execution** — For each entry in `actions_required`:
   - `issue_refund` → call billing API, record refund ID
   - `apply_credit` → call billing API, record credit amount
   - `reset_password` → call auth API, send reset link
   - `create_ticket` → create follow-up ticket in ticketing system
   - `transfer` → route to specified team
   - Record success/failure for each action.
2. **Response delivery** — Send `approved_response` via `channel`:
   - email → send email, record message_id
   - chat → post in chat thread, record timestamp
   - phone → queue for outbound call / add to agent script
   - social → post reply, record post_id
   - in_app → push notification + in-app message
3. **Delivery confirmation** — Verify message was delivered (API confirmation, not bounce).
4. **Escalation check** — If any `actions_required` failed OR delivery failed:
   - Set `escalated = true`
   - Route to `escalation_path` (human agent)
   - Include failure details in escalation context
5. **Resolution type** — Classify:
   - `first_contact`: resolved in single interaction
   - `multi_touch`: required previous interactions
   - `escalated`: handed to human
   - `automated`: fully resolved by system actions

## B: Output

```yaml
ticket_id:          string
customer_id:        string
resolution_type:    enum      # {first_contact, multi_touch, escalated, automated}
delivered:          bool      # response successfully sent
escalated:          bool      # handed off to human
actions_completed:  object[]
  - action_type:    string
    success:        bool
    reference_id:   string?   # refund ID, credit ID, etc.
    error:          string?   # if failed
delivery_channel:   string    # channel used
delivery_reference: string?   # message_id, post_id, etc.
resolution_timestamp: datetime
sla_met:            bool      # resolved within SLA?
```

## P: Postcondition Checklist

- [ ] `ticket_id` in B matches A
- [ ] `customer_id` in B matches A
- [ ] `resolution_type` ∈ `{first_contact, multi_touch, escalated, automated}`
- [ ] `delivered` and `escalated` are mutually exclusive: exactly one is true
- [ ] `delivered = true` ⟹ `delivery_reference` is non-null
- [ ] `escalated = true` ⟹ `resolution_type = escalated`
- [ ] `len(actions_completed) = len(actions_required)` from A (every action attempted)
- [ ] Each `actions_completed[i].action_type` matches `actions_required[i].action_type`
- [ ] If any `actions_completed[].success = false` → `escalated = true`
- [ ] `sla_met = (resolution_timestamp ≤ sla_resolution)` from A
- [ ] `resolution_timestamp` is valid ISO 8601, not future-dated
- [ ] `delivery_channel` matches `channel` from A
- [ ] If `actions_required` is null/empty → `actions_completed` is empty (no phantom actions)
