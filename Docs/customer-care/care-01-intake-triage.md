# intake-triage

**Workflow:** Customer Support Escalation  
**Domain:** Customer Care  
**Contract:** `intake-triage: A → B | P`

---

## A: Input

```yaml
ticket_id:          string    # generated at channel entry
customer_id:        string    # CRM identifier
channel:            enum      # {email, chat, phone, social, in_app}
message:            string    # raw customer message (text or transcription)
product_id:         string?   # product referenced (nullable)
account_tier:       enum      # {free, standard, premium, enterprise}
history:            object[]  # last 10 interactions
  - ticket_id:      string
    date:           date
    category:       string
    resolution:     enum      # {resolved, escalated, abandoned}
    csat_score:     number?   # [1..5] if collected
```

## F: Processing Logic

1. **Category classification** — Analyze `message` content to assign category:
   - `{billing, technical, account, product_defect, feature_request, complaint, general}`
   - Use keyword matching + intent detection. If ambiguous, assign `general` + flag for human review.
2. **Priority scoring** — Calculate priority [1..5] from weighted factors:
   - Account tier weight: enterprise=5, premium=4, standard=2, free=1
   - Channel urgency: phone=+1, chat=+0.5, email=0
   - History escalation count: >2 escalations in last 90 days → +1
   - Message sentiment signal: profanity/caps/exclamation → +1
   - `priority = clamp(round(weighted_sum), 1, 5)`
3. **Team routing** — Map `(category, priority)` to team:
   - billing + any priority → billing_team
   - technical + priority ≥ 4 → senior_engineering
   - technical + priority < 4 → tier1_support
   - complaint + priority ≥ 3 → retention_team
   - All others → general_support
4. **SLA assignment** — Based on priority:
   - P1: 1 hour first response, 4 hours resolution
   - P2: 2 hours first response, 8 hours resolution
   - P3: 4 hours first response, 24 hours resolution
   - P4: 8 hours first response, 48 hours resolution
   - P5: 24 hours first response, 72 hours resolution
5. **Repeat contact detection** — If `history` contains >2 tickets with same `category` in last 30 days, flag as `repeat_contact` and boost priority by 1.

## B: Output

```yaml
ticket_id:          string    # passthrough
customer_id:        string    # passthrough
category:           enum      # classified category
subcategory:        string?   # finer classification if available
priority:           number    # [1..5] where 1=highest
assigned_team:      string    # routing destination
sla_first_response: datetime  # deadline for first response
sla_resolution:     datetime  # deadline for resolution
repeat_contact:     bool      # flagged if same-category history
context_summary:    string    # 2-3 sentence summary of issue for agent
triage_confidence:  number    # [0,1] classification confidence
triage_timestamp:   datetime
```

## P: Postcondition Checklist

- [ ] `ticket_id` in B matches A
- [ ] `customer_id` in B matches A
- [ ] `category` ∈ `{billing, technical, account, product_defect, feature_request, complaint, general}`
- [ ] `priority` ∈ `{1, 2, 3, 4, 5}` (integer, not float)
- [ ] `assigned_team` is non-empty string
- [ ] `assigned_team` is consistent with `(category, priority)` routing rules
- [ ] `sla_first_response > triage_timestamp` (SLA is in the future)
- [ ] `sla_resolution > sla_first_response` (resolution deadline after first response)
- [ ] SLA durations match priority level (P1=1hr/4hr, P2=2hr/8hr, etc.)
- [ ] `repeat_contact = true` ⟹ history contains ≥3 tickets with same category in last 30 days
- [ ] `context_summary` is non-empty, ≤500 characters
- [ ] `context_summary` references the actual issue from `message` (not generic)
- [ ] `triage_confidence ∈ [0, 1]`
- [ ] If `triage_confidence < 0.6` → `category` should be `general` (low-confidence fallback)
- [ ] `triage_timestamp` is valid ISO 8601, not future-dated
- [ ] No PII leakage: `context_summary` does not contain raw account numbers, SSN, or passwords from message
