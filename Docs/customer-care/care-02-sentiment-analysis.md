# sentiment-analysis

**Workflow:** Customer Support Escalation  
**Domain:** Customer Care  
**Contract:** `sentiment-analysis: A → B | P`

---

## A: Input

```yaml
ticket_id:          string
customer_id:        string
message:            string    # current message
history:            object[]  # last 10 interactions
  - ticket_id:      string
    date:           date
    category:       string
    csat_score:     number?
channel:            enum      # {email, chat, phone, social, in_app}
account_tenure_months: number # how long customer has been active
monthly_spend:      number    # average monthly spend (USD)
```

## F: Processing Logic

1. **Sentiment classification** — Analyze `message` for emotional tone:
   - `positive`: gratitude, satisfaction, praise
   - `neutral`: factual inquiry, no emotional signal
   - `negative`: frustration, disappointment, complaint
   - `angry`: hostility, threats to leave, profanity, ALL CAPS
2. **Urgency scoring** [1..5] — Weighted by:
   - Sentiment: angry=5, negative=3, neutral=2, positive=1
   - Temporal language: "immediately", "urgent", "right now" → +1
   - Business impact language: "losing money", "can't operate", "deadline" → +1
3. **Churn risk** [0, 1] — Predictive score from:
   - Sentiment trajectory: improving (+) or worsening (-) over `history`
   - Recent CSAT: avg(last 3 csat_scores) < 2.5 → high risk
   - Account tenure: `< 6 months` → higher baseline risk
   - Spend trend: declining → higher risk
   - `churn_risk = sigmoid(weighted_features)`
4. **Intent detection** — Classify what the customer wants:
   - `{get_help, get_refund, cancel, upgrade, complain, request_feature, escalate}`
5. **Key phrase extraction** — Pull 3-5 phrases that capture the core issue.

## B: Output

```yaml
ticket_id:          string
sentiment:          enum      # {positive, neutral, negative, angry}
sentiment_score:    number    # [-1, 1] continuous (-1=angry, +1=positive)
urgency:            number    # [1..5]
churn_risk:         number    # [0, 1]
churn_factors:      string[]  # top contributing factors
intent:             enum      # primary intent
secondary_intent:   enum?     # if detected
key_phrases:        string[]  # 3-5 phrases from message
sentiment_trajectory: enum    # {improving, stable, worsening} (from history)
analysis_timestamp: datetime
```

## P: Postcondition Checklist

- [ ] `ticket_id` in B matches A
- [ ] `sentiment` ∈ `{positive, neutral, negative, angry}`
- [ ] `sentiment_score` ∈ `[-1, 1]`
- [ ] `sentiment` and `sentiment_score` are consistent (angry → score < -0.5, positive → score > 0.3)
- [ ] `urgency` ∈ `{1, 2, 3, 4, 5}` (integer)
- [ ] `churn_risk` ∈ `[0, 1]`
- [ ] `churn_factors` is non-empty if `churn_risk > 0.5`
- [ ] `intent` ∈ `{get_help, get_refund, cancel, upgrade, complain, request_feature, escalate}`
- [ ] `key_phrases` has 3-5 entries
- [ ] Each key phrase actually appears in (or paraphrases) the original `message`
- [ ] `sentiment_trajectory` ∈ `{improving, stable, worsening}`
- [ ] If `history` is empty → `sentiment_trajectory = stable` (no data to trend)
- [ ] `analysis_timestamp` is valid ISO 8601, not future-dated
- [ ] No S→T: sentiment describes this interaction, not the customer as a person
- [ ] No L→G: churn risk is for this customer, not generalized to segment
