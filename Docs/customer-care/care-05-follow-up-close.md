# follow-up-close

**Workflow:** Customer Support Escalation  
**Domain:** Customer Care  
**Contract:** `follow-up-close: A → B | P`

---

## A: Input

```yaml
ticket_id:          string
customer_id:        string
resolution_type:    enum      # from resolve
delivered:          bool
escalated:          bool
churn_risk:         number    # [0, 1] from sentiment-analysis
category:           string
channel:            enum
sla_met:            bool
account_tier:       enum      # {free, standard, premium, enterprise}
actions_completed:  object[]  # from resolve
```

## F: Processing Logic

1. **Closure eligibility** — Ticket can close if:
   - `delivered = true` AND no pending follow-up actions
   - OR `escalated = true` AND escalation team has accepted
   - Cannot close if actions failed and no escalation occurred.
2. **CSAT survey trigger** — Request satisfaction score if:
   - `channel ∈ {email, chat, in_app}` (surveyable channels)
   - Customer has not been surveyed in last 7 days
   - `csat_requested = true`
3. **Retention flag** — Set `retention_flag = true` if:
   - `churn_risk > 0.7`
   - OR `resolution_type = escalated` AND `account_tier ∈ {premium, enterprise}`
   - OR customer expressed `cancel` intent (from earlier intent classification)
4. **Retention action** — If `retention_flag = true`:
   - Enterprise: schedule account manager follow-up within 24h
   - Premium: queue proactive outreach email with satisfaction check
   - Standard/free: add to retention monitoring list
5. **Ticket closure** — Set final status:
   - `resolved`: delivered and no issues
   - `escalated_open`: handed to human, not yet resolved
   - `closed_unresolved`: customer abandoned or SLA expired
6. **Knowledge base candidate** — If `resolution_type = first_contact` and `category = technical`, flag resolution as KB article candidate.

## B: Output

```yaml
ticket_id:          string
customer_id:        string
closed:             bool
final_status:       enum      # {resolved, escalated_open, closed_unresolved}
csat_requested:     bool
retention_flag:     bool
retention_action:   string?   # null if no retention needed
kb_candidate:       bool      # flag for knowledge base article
time_to_resolution: duration  # from ticket creation to close
closure_timestamp:  datetime
summary:            string    # 1-2 sentence resolution summary
```

## P: Postcondition Checklist

- [ ] `ticket_id` in B matches A
- [ ] `customer_id` in B matches A
- [ ] `closed` is boolean
- [ ] `final_status` ∈ `{resolved, escalated_open, closed_unresolved}`
- [ ] `closed = true` ⟹ `final_status ∈ {resolved, closed_unresolved}` (escalated_open is not closed)
- [ ] `final_status = resolved` ⟹ `delivered = true` in A
- [ ] `final_status = escalated_open` ⟹ `escalated = true` in A
- [ ] `retention_flag = true` ⟹ (`churn_risk > 0.7` OR (`escalated` AND `account_tier ∈ {premium, enterprise}`))
- [ ] `retention_flag = true` ⟹ `retention_action` is non-null, non-empty
- [ ] `retention_flag = false` ⟹ `retention_action` is null
- [ ] `csat_requested` is boolean
- [ ] `time_to_resolution` is positive duration
- [ ] `closure_timestamp` is valid ISO 8601, not future-dated
- [ ] `summary` is non-empty, ≤ 300 characters
- [ ] `summary` references the actual resolution, not generic text
- [ ] `kb_candidate = true` ⟹ `resolution_type = first_contact` AND `category = technical`
