# TPMN Contract Specifications

Enterprise workflow contracts formalized in [TPMN (Typed Process Meta-Notation)](https://github.com/gem-squared/tpmn-psl). Each contract defines:

- **A** — Typed input (what goes in)
- **F** — Processing logic (what the function does, step by step)
- **B** — Typed output (what comes out)
- **P** — Postcondition checklist (what AI verifies for completion)

15 contracts across 3 enterprise domains. Every postcondition in **P** is a verifiable assertion — designed so an AI governance system can check contract satisfaction automatically.

---

## Workflow 1: [Loan Approval Pipeline](loan-approval/) (Financial Services)

```
pre-screen → credit-scoring → compliance-check → underwriting → disbursement
                                    ▲
                              AI verification
                          (regulatory + SPT flags)
```

| # | Function | Contract |
|---|----------|----------|
| 1 | [pre-screen](loan-approval/loan-01-pre-screen.md) | `{applicant, income, loan} → {eligible, dti, flags} \| identity ∧ income ∧ debt checks` |
| 2 | [credit-scoring](loan-approval/loan-02-credit-scoring.md) | `{applicant, credit_history} → {score, tier, ratios} \| score ∈ [300,850] ∧ tier consistency` |
| 3 | [compliance-check](loan-approval/loan-03-compliance-check.md) | `{applicant, score, loan} → {compliant, reg_checks, flags} \| ECOA ∧ TILA ∧ MLA ∧ SPT` |
| 4 | [underwriting](loan-approval/loan-04-underwriting.md) | `{applicant, score, compliant} → {approved, rate, term} \| compliance gate ∧ tier gate` |
| 5 | [disbursement](loan-approval/loan-05-disbursement.md) | `{approved, amount, account} → {loan_id, schedule, total} \| amortization ∧ conditions met` |

---

## Workflow 2: [Customer Support Escalation](customer-care/) (Customer Care)

```
intake-triage → sentiment-analysis → response-quality-check → resolve → follow-up-close
                                            ▲
                                      AI verification
                                  (tone + accuracy + SLA)
```

| # | Function | Contract |
|---|----------|----------|
| 1 | [intake-triage](customer-care/care-01-intake-triage.md) | `{ticket, message, history} → {category, priority, team, SLA} \| routing rules ∧ SLA math` |
| 2 | [sentiment-analysis](customer-care/care-02-sentiment-analysis.md) | `{ticket, message, history} → {sentiment, urgency, churn_risk} \| score ranges ∧ no S→T` |
| 3 | [response-quality-check](customer-care/care-03-response-quality-check.md) | `{ticket, draft, sentiment} → {approved, scores, issues} \| tone ≥ 0.7 ∧ accuracy ≥ 0.9` |
| 4 | [resolve](customer-care/care-04-resolve.md) | `{ticket, response, actions} → {delivered, escalated, sla_met} \| XOR(delivered, escalated)` |
| 5 | [follow-up-close](customer-care/care-05-follow-up-close.md) | `{ticket, resolution, churn} → {closed, status, retention} \| retention trigger ∧ CSAT` |

---

## Workflow 3: [Procurement & Vendor Onboarding](procurement/) (Operations)

```
vendor-intake → vendor-risk-scoring → contract-review → purchase-order → payment-processing
                                            ▲
                                      AI verification
                                  (liability + SLA + data)
```

| # | Function | Contract |
|---|----------|----------|
| 1 | [vendor-intake](procurement/proc-01-vendor-intake.md) | `{vendor, tax_id, certs} → {vendor_id, verified, missing} \| sanctions ∧ docs complete` |
| 2 | [vendor-risk-scoring](procurement/proc-02-vendor-risk-scoring.md) | `{vendor, financials, certs} → {score, tier, factors} \| score = sum(4 sub-scores)` |
| 3 | [contract-review](procurement/proc-03-contract-review.md) | `{vendor, contract, policy} → {approved, issues, flags} \| liability cap ∧ SLA ∧ IP ∧ data` |
| 4 | [purchase-order-mgmt](procurement/proc-04-purchase-order-mgmt.md) | `{vendor, items, budget} → {po_id, total, approvals} \| budget ∧ contract headroom` |
| 5 | [payment-processing](procurement/proc-05-payment-processing.md) | `{po, invoice, delivery} → {payment_id, status, audit} \| 3-way match ∧ no duplicate` |

---

## How gem2-studio Uses These Contracts

Each function above maps to one **UNIT-WORK** in a gem2-studio work-plan:

```
/plan-work "loan approval pipeline"
    → Creates 5 unit-works, each with CONTRACT: A → B | P

/proceed-work (×5)
    → Executes each unit, records result

/verify-work
    → Checks every postcondition in P
    → 6-dimension epistemic audit on AI-generated content
    → SPT flag detection (L→G, S→T, Δe→∫de)

/archive-work
    → Proven contracts → knowledge graph (pgvector)
    → Future sessions reuse verified patterns
```

## License

CC-BY-4.0 — These contract specifications are open. Anyone can implement a TPMN-compatible verification system.

*GEM².AI — Formal contracts for enterprise AI workflows.*
