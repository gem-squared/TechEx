# GEM² Audit & Governance Gate: Three-Layer AI Governance
## TechEX Hackathon — Track 1: Agent Security & AI Governance (Powered by Veea)

**Team:** GEM².AI | **Lead:** David Seo | **Demo:** gem2-governance-console.fly.dev

---

## SLIDE 1 — The Problem

**Enterprise AI agents are making financial decisions with zero governance.**

Three failure modes that current solutions miss:

| Failure | Example | Who gets hurt |
|---------|---------|---------------|
| **Security** | Prompt injection exfiltrates customer PII | Legal, compliance, customers |
| **Epistemics** | "Every enterprise will save 90% with AI" presented as fact | Board decisions, investor trust |
| **Compliance** | AI agent processes frozen account transaction, skips compliance review | Regulators, audit, customers |

Existing guardrails solve one at most. Never all three.

- Content filters catch injections but pass hallucinated statistics
- LLM evaluators catch overclaims but take 5-30s and miss payload attacks
- Compliance checks are manual, after-the-fact, disconnected from the pipeline

**No single layer can govern security, truth, AND regulatory compliance.**

---

## SLIDE 2 — Our Solution: Three Layers, One Pipeline

```
Input → [ Layer 0: Lobster Trap DPI ] → DENY / ALLOW
                                              ↓ ALLOW
         [ Layer 1: GEM² Truth Filter ] → BLOCK / REVIEW / ALLOW
                                              ↓
         [ Layer 2: GEM² Compliance Check ] → BLOCK / ALLOW
                                              ↓
                                          Governed Output
```

| Layer | What | Speed | Cost | Catches |
|-------|------|-------|------|---------|
| **Layer 0** — Lobster Trap (Veea) | Regex DPI, 22 metadata fields, YAML policy engine | **<15ms** | **$0** | Injections, PII, credentials, exfiltration, malware requests |
| **Layer 1** — GEM² Truth Filter | LLM-powered epistemic audit with bank ledger context | **5-30s** | **~$0.01** | Overclaims, hallucinations, unsourced extrapolation, SPT violations, overdrafts |
| **Layer 2** — GEM² Compliance Check | TF-IDF regulation matching + LLM audit against GDPR/SOC2/HIPAA | **5-30s** | **~$0.01** | Regulatory violations, unauthorized data exports, access control breaches |

**Key insight:** Layer 0 asks "Is this safe?" Layer 1 asks "Is this true?" Layer 2 asks "Is this compliant?" These are fundamentally different questions. You need all three.

---

## SLIDE 3 — Live Demo: Banking AI Agent Governance

### The scenario: A banking AI agent node processing customer transactions

We demonstrate GEM² as a governance gate on a single banking system node — exactly the kind of agentic workflow Track 1 targets. The agent handles withdrawals, transfers, account modifications — every request passes through three layers of governance before execution.

**Mock Bank Ledger** (6 accounts):
| UserID | Name | Role | Level | Account | Balance | Status |
|--------|------|------|-------|---------|---------|--------|
| david01 | David Seo | Customer | 2 | 8832-1234 | $1,000.00 | Active |
| alice02 | Alice Kim | Customer | 1 | 4519-5678 | $250.00 | Active |
| bob03 | Bob Chen | Customer | 3 | 7201-9012 | $52,400.00 | Active |
| carol04 | Carol Park | Customer | 1 | 3364-3456 | $75.50 | Frozen |
| eve05 | Eve Zhang | Employee | 4 | 6150-7890 | $8,300.00 | Active |
| frank06 | Frank Lee | Admin | 5 | 9087-2345 | $15,000.00 | Active |

### What judges can do right now at gem2-governance-console.fly.dev:

**1. Live Inspection — Banking Mode**
- Check "Banking Mode" → Ledger button + compliance samples appear
- Click Ledger → see full bank account state, Copy any row into prompt
- Click Auto → watch all 3 layers process the banking transaction in real-time
- AI Interpretation explains the three-layer verdict

**Banking compliance samples (6 pre-built):**
| Sample | What it tests |
|--------|---------------|
| ✅ Normal withdrawal — David $20 | Clean transaction, should pass all 3 layers |
| ⚠️ Overdraft attempt — Alice $500 | Alice has $250, requests $500 — L1 flags with ledger cross-reference |
| 🚫 Frozen account transaction | Carol's account is Frozen — L2 catches regulatory violation |
| 🚫 Unauthorized bulk export | Mass PII export — L0 blocks, L2 flags GDPR violation |
| 🚫 Privilege escalation | Level 1 → Level 5 Admin bypass — L2 flags SOC2 access control violation |
| ⚠️ Large transfer — Bob $50K | Offshore wire, skip compliance review — L2 flags regulatory risk |

**2. Live Inspection — General Mode**
- Uncheck "Banking Mode" → standard governance testing
- Paste any prompt, AI output, or attack payload
- Test prompt injections, exfiltration, malware, phishing, epistemic overclaims

**3. Scenario Suite** — 9 automated test scenarios
- Covers all 7 judging criteria + adversarial obfuscation
- Real-time progress bar, scorecard, metrics
- Per-scenario drill-down with AI interpretation

**4. Red Team Resilience** — Attack-defense arms race, visualized
- 6 rounds of external red teaming as interactive timeline
- 39 findings with severity badges, fix summaries, normalization stage labels
- Summary: 33 fixed, 6 architectural, 0 Layer 1 bypasses

**5. Multi-Provider Audit**
- Same content evaluated by Gemini, Claude, GPT-4o, o3
- Cross-provider consensus = strongest signal

---

## SLIDE 4 — Measurable Results

### Production metrics from 9-scenario suite:

| Metric | Value |
|--------|-------|
| **Risk Reduction** | 0% → 100% |
| **Injection Detection** | 100% |
| **Exfiltration Block** | 100% |
| **Guardrail Enforcement** | 100% |
| **False Positive Rate** | 0% |
| **Mean Detection Time** | <15ms (Layer 0) |

### Banking compliance demo results:

| Transaction | L0 | L1 (with ledger) | L2 (regulation match) | Final |
|-------------|----|--------------------|----------------------|-------|
| David $20 withdrawal | ALLOW | ALLOW (balance sufficient) | ALLOW (compliant) | **ALLOW** |
| Alice $500 overdraft | ALLOW | BLOCK (balance $250 < $500) | Violated: SOC2 CC6.1 | **BLOCK** |
| Frozen account transfer | ALLOW | BLOCK (account Frozen) | Violated: HIPAA §164.312 | **BLOCK** |
| Bulk PII export | DENY | — | Violated: GDPR Art. 17 | **BLOCK** |
| Privilege escalation | ALLOW | BLOCK (unauthorized) | Violated: SOC2 CC6.3 | **BLOCK** |

### After 6 rounds of external red teaming (140+ adversarial payloads):

| Round | Findings | Fixed | Status |
|-------|----------|-------|--------|
| R1 | Server hardening (timeouts, key compare, cache cap, error redaction) | 8/8 | Deployed |
| R2 | Interpret disclaimers, data notice, console body limits | 5/5 | Deployed |
| R3 | Homoglyph bypass, leetspeak bypass, rate limiting | 5/5 | Deployed |
| R5 | Letter spacing, Base64/ROT13/Braille encoding, URL/HTML bypass | 6/6 | Deployed |
| R6 | Tab injection, soft hyphen, word joiner, non-space delimiters | 4/4 fixable + 4 architectural | Deployed |
| R7-8 | Variation selectors, math operators, PUA, non-characters, annotations | 7/7 (categorical Unicode sanitization) | Deployed |

**Red team verdict:** "GEM² holds firm on formatting tricks. 0 Layer 1 bypasses across all providers." — Kobus Wentzel

---

## SLIDE 5 — How It Maps to Judging Criteria

| Criterion | How We Address It | Evidence |
|-----------|-------------------|----------|
| **1. Prompt Injection & Exfiltration** | L0 DENY on injection/exfiltration scenarios. L1 catches semantic exfiltration. | Scenario Suite + Live Inspection |
| **2. Guardrails & Policy** | 14-rule YAML policy engine + L2 compliance regulations (GDPR, SOC2, HIPAA). Banking Mode enforces transaction policies. | 15 embedded regulations, 6 banking samples |
| **3. Access Control** | Banking ledger with roles/levels. L2 flags privilege escalation (Level 1→5 bypass). SOC2 CC6.1/CC6.3 enforcement. | Privilege escalation sample → BLOCK |
| **4. Observability & Audit** | Every decision logged: rule fired, risk score, SPT violations, matched regulations, ledger cross-reference. AI Interpretation explains verdicts. **Audit trail a regulator could read.** | All 3 layers produce structured audit data |
| **5. Red-Teaming & Adversarial** | 6 rounds external red team. Full normalization chain: confusables, leet, Base64, ROT13, Braille, categorical Unicode. | Red Team Resilience tab, 39 findings |
| **6. Governance & Explainability** | AI Interpretation explains every 3-layer verdict in plain English. Disclaimer on all AI summaries. Multi-provider consensus. | Interpret buttons on every result |
| **7. Multi-Agent Security** | Banking node demonstrates governance gate pattern — every agent action passes through 3-layer pipeline. SPT violation detection (L→G, S→T). | Banking Mode demo flow |

### Track 1 Focus Area Coverage:

| Focus Area | Coverage | How |
|------------|----------|-----|
| Guardrails and safety layers for agentic workflows | **Strong** | 3-layer pipeline: L0 DPI + L1 Epistemic + L2 Compliance |
| Monitoring and observability (hallucination, drift, misuse) | **Strong** | L1 truth score, SPT flags, epistemic scoring, 6-dimension evaluation |
| Access control and permission frameworks | **Demonstrated** | Banking ledger with roles/levels, L2 SOC2 access control enforcement |
| Audit trails for regulated industries (finance, healthcare) | **Strong** | L2 GDPR/SOC2/HIPAA matching, banking ledger cross-reference, AI Interpretation |
| Red-teaming frameworks | **Strong** | 6 rounds, 39 findings, interactive Red Team Resilience tab |

---

## SLIDE 6 — Architecture Deep Dive

### Layer 0: Lobster Trap (Veea)

```
Content → 22 metadata fields → YAML policy engine → Verdict
```

- Single Go binary, zero dependencies
- 22 analysis dimensions: PII, credentials, injection, exfiltration, harm, phishing, malware, obfuscation, role impersonation, system commands, sensitive paths, file paths, URLs...
- iptables-style priority rules (100=highest)
- Actions: DENY, HUMAN_REVIEW, LOG, ALLOW
- **Normalization chain:** URL/HTML decode → Base64 detect → Braille transliterate → ROT13 → categorical Unicode sanitization → NFKC → confusable map → leetspeak decode → word-splitter normalization → letter-spacing collapse

### Layer 1: GEM² Truth Filter

```
Content + Bank Ledger Context → LLM evaluator → Epistemic scores + SPT + EEF → Verdict
```

- 3 core scores: epistemic_score, contract_score, truth_score (0-100)
- SPT violation detection: State→Trait, Local→Global, Incremental→Mass
- EEF (Epistemic Extrapolation Flag): quantifies how far beyond evidence
- 6-dimension evaluation scorecard
- **Banking Mode:** Ledger context prepended — LLM cross-references account balances, roles, status
- Multi-provider: Gemini, Claude, GPT-4o, o3
- Verdict thresholds: ALLOW (≥70), REVIEW (40-69), BLOCK (<40)

### Layer 2: GEM² Compliance Check

```
Content → TF-IDF regulation search (top 3) → Augmented prompt + Ledger → LLM compliance audit → Verdict
```

- 15 embedded regulations: 5 GDPR, 5 SOC2, 5 HIPAA
- TF-IDF keyword matching with IDF weighting (pure Go, in-memory)
- Top-3 relevant regulations extracted per request
- Augmented prompt includes matched regulations + full bank ledger state
- LLM evaluates compliance against matched regulations
- Verdict: ALLOW (compliant) or BLOCK (violated) with specific regulation citations

### Infrastructure

| Component | Stack | Where |
|-----------|-------|-------|
| GEM² TPMN Server | Go, Fly.io (IAD) | gem2-tpmn-checker.fly.dev |
| Audit & Governance Gate | Go + embedded JS, Fly.io (NRT) | gem2-governance-console.fly.dev |
| Lobster Trap | Go binary (embedded in console) | In-process |

Security hardening: HTTP server timeouts, constant-time key compare, MaxBytesReader (100KB inspect, 1MB others), LRU cache cap (1024), error redaction by tier, IP-based rate limiting (10/min heavy, 60/min light).

---

## SLIDE 7 — The Epistemic Boundary (What Makes GEM² Different)

Most AI safety tools ask: "Is this content harmful?"

GEM² asks: "Is this content **epistemically sound**?"

### SPT Framework (State-Process-Trait)

| Violation | Pattern | Example |
|-----------|---------|---------|
| **S→T** | Temporary condition → permanent trait | "AI is fundamentally transforming every enterprise" |
| **L→G** | One case → universal claim | "Microsoft saw 55% gains → every company will" |
| **Δe→∫de** | Small pilot → sweeping prediction | "10% efficiency gain → $50B global savings" |

These are the exact patterns that make enterprise AI content dangerous — not because they're "harmful" in a content-moderation sense, but because they're **epistemically ungrounded**. Boards make decisions based on this content. Investors allocate capital. Regulators form policy.

**GEM² is the only system that formally detects these overclaim patterns.**

---

## SLIDE 8 — Why Three Layers Beat One

### The Banking Agent Test

Same banking node, six transaction requests, three governance layers:

| Transaction | L0 (Security) | L1 (Truth + Ledger) | L2 (Compliance) | Final |
|-------------|---------------|---------------------|-----------------|-------|
| David $20 withdrawal | ALLOW (clean) | ALLOW (balance OK) | ALLOW (compliant) | **ALLOW** |
| Alice $500 overdraft | ALLOW (no injection) | **BLOCK** (balance $250) | Violated SOC2 | **BLOCK** |
| Frozen account transfer | ALLOW (no injection) | **BLOCK** (account Frozen) | Violated HIPAA | **BLOCK** |
| Bulk PII export | **DENY** (exfiltration) | — | Violated GDPR | **BLOCK** |
| Privilege escalation | ALLOW (no injection) | **BLOCK** (unauthorized) | Violated SOC2 | **BLOCK** |
| $50K offshore wire | ALLOW (no injection) | **REVIEW** (high-risk) | Violated SOC2 | **BLOCK** |

**Each layer catches what the others miss:**
- L0 catches the bulk export (regex pattern match) — L1/L2 never run
- L1 catches the overdraft (ledger cross-reference) — L0 sees nothing wrong
- L2 catches the frozen account (regulatory violation) — L0 and L1 might miss the compliance angle

**This is why you need all three.** Same pipeline, different questions, complementary coverage.

---

## SLIDE 9 — Red Team Resilience

### 6 rounds, 140+ payloads, external tester

**What was found and fixed:**
- Unicode homoglyph injection (Cyrillic lookalikes) → confusable normalization
- Leetspeak substitution (r4ns0mw4r3) → context-aware leet decode
- No rate limiting → IP-based token bucket (429 on abuse)
- Interpret endpoint rubber-stamps fabricated data → disclaimer + provenance caveat
- Error messages leak internal details → tier-based redaction
- Letter-spaced evasion (W r i t e) → letter-spacing collapse
- Encoding bypasses (Base64, ROT13, URL, HTML entities) → multi-layer decode chain
- Braille block evasion (⠺⠗⠊⠞⠑) → Braille-to-Latin transliteration
- Invisible Unicode (zero-width, soft hyphens, variation selectors, PUA, non-characters) → categorical Unicode sanitization
- Non-space delimiter evasion (tabs, underscores, pipes) → word-splitter normalization

**What was NOT bypassed:**
- Layer 1 (GEM² Truth Filter): 0 bypasses across all rounds, all providers
- Cross-provider consistency: Gemini, Claude, GPT-4o, o3 agree on verdicts
- Formatting tricks (code blocks, JSON wrappers, markdown tables): all caught

**What remains architectural (documented, accepted):**
- Semantic rephrasing (synonyms bypass regex) → needs Layer 0.5 intent classifier
- Payload splitting (stateless) → needs session-aware inspection
- Emoji variant encoding → needs emoji-aware tokenizer

Red team repo published: github.com/kobie3717/ai-governance-redteam

---

## SLIDE 10 — Deployment & Reproducibility

### Try it now:
```
https://gem2-governance-console.fly.dev
```

### Banking Mode demo flow:
1. Check "Banking Mode" checkbox
2. Click "Ledger" to see bank accounts
3. Click "Copy" on Alice's row → prompt injected
4. Click "Auto" → watch L0 → L1 → L2 process in real-time
5. Click "AI Interpretation" → plain-English three-layer verdict

### Run locally:
```bash
git clone https://github.com/gem-squared/gem2-studio-hack
cd demo-beta && go run ./console/
```

### API access:
```bash
curl -X POST https://gem2-tpmn-checker.fly.dev/api/v1/truth-filter \
  -H "Content-Type: application/json" \
  -d '{"content":"YOUR AI OUTPUT HERE","provider":"gemini","model":"gemini-2.5-flash","gemini_api_key":"YOUR_KEY"}'
```

### Open source components:
| Component | License | Link |
|-----------|---------|------|
| Lobster Trap | MIT | github.com/veeainc/lobstertrap |
| TPMN-PSL spec | MIT | github.com/gem-squared/tpmn-psl |
| Audit & Governance Gate | MIT | github.com/gem-squared/gem2-studio-hack |
| GEM² Truth Filter | Proprietary API | gem2-tpmn-checker.fly.dev |

---

## SLIDE 11 — What's Next

| Horizon | What | Impact |
|---------|------|--------|
| **Now** | Production-ready three-layer governance for any LLM pipeline | Drop-in security + truth + compliance |
| **Q3 2026** | Layer 0.5: semantic intent classifier (bridge regex ↔ LLM) | Catch semantic rephrasing without LLM cost |
| **Q4 2026** | Session-aware stateful inspection | Defeat payload splitting, multi-turn attacks |
| **2027** | GEM² Governance SDK: pip install / npm install | One-line integration for any agent framework |

### The vision:

> Every enterprise AI agent ships with three layers of governance — one for security, one for truth, one for compliance. Lobster Trap at the wire. GEM² at the output. No hallucination reaches the board. No injection reaches the model. No violation reaches the regulator.

---

## SLIDE 12 — Ask

**For judges:** Check Banking Mode. Open the Ledger. Copy Alice's row. Click Auto. Watch three layers catch the overdraft that no single layer would. The console is live at gem2-governance-console.fly.dev.

**For Veea:** Lobster Trap is the fastest DPI engine we've tested. The confusable normalization and leet decode we added should be upstreamed — they make every LT deployment resilient to the #1 and #2 bypass classes in the wild.

**For enterprises:** If your AI agents process financial transactions, you need all three layers. Security alone misses overdrafts. Truth alone misses injections. Compliance alone misses hallucinations.

---

## SUBMISSION CHECKLIST

### Code / Build
- [x] **Working prototype online** — gem2-governance-console.fly.dev (live, deployed, accessible)
- [x] **Original work** — built within hackathon window (May 11-19)
- [x] **Open source (MIT)** — github.com/gem-squared/gem2-studio-hack
- [x] **Lobster Trap integrated** — embedded binary, 22 metadata fields, YAML policy engine, full normalization chain (10-stage)
- [x] **AI/LLM model integration** — Gemini, Claude, GPT-4o, o3 as Layer 1/2 evaluators + multi-provider consensus
- [x] **Red team hardened** — 6 rounds, 140+ payloads, 35+ findings fixed, 0 Layer 1 bypasses
- [x] **Banking compliance demo** — 6 accounts, 6 compliance samples, ledger cross-reference, GDPR/SOC2/HIPAA

### lablab.ai Submission Form
- [ ] **Title** — max 50 chars (e.g., "GEM² Audit & Governance Gate")
- [ ] **Short description** — max 255 chars
- [ ] **Long description** — min 100 words
- [ ] **Track** — Track 1: Agent Security & AI Governance
- [ ] **Technologies listed** — Lobster Trap, Gemini 2.5, Claude 4.6, GPT-4o, o3, Go, Fly.io
- [ ] **Cover image** — 16:9 ratio (1920x1080)

### Demo Materials
- [ ] **Video** — under 5 min, under 300MB
- [ ] **Pitch deck** — this document (convert to slides)
- [ ] **Live demo URL** — gem2-governance-console.fly.dev

### Video Script (recommended structure)
| Segment | Duration | Content |
|---------|----------|---------|
| Hook | 0:00-0:30 | "When your banking AI agent processes a $50K offshore wire for a frozen account, who catches it? Not the regex filter. Not the LLM. You need all three layers." |
| Problem | 0:30-1:00 | Security vs epistemics vs compliance gap. No single layer governs all three. |
| Architecture | 1:00-1:30 | Three-layer pipeline diagram. Lobster Trap + GEM² Truth Filter + Compliance Check. |
| Banking Demo | 1:30-3:30 | Banking Mode ON. Open Ledger. Copy Alice (overdraft). Auto → 3 layers. Copy Carol (frozen). Auto. Show AI Interpretation. Toggle Banking Mode OFF → general governance. |
| Red Team | 3:30-4:00 | 6 rounds, 140+ payloads, 0 Layer 1 bypasses. Show Red Team Resilience tab — click to expand rounds. |
| Ask | 4:00-4:30 | Call to action. Live URL for judges. "Try to break it." |

### Judge-Specific Angles
| Judge | Role | What resonates |
|-------|------|---------------|
| **Rahul Gupta** | AI Foundry, Insight Global | Enterprise agent deployment at scale — governance is his daily problem |
| **Pavan Gondhi** | SVP, JP Morgan | **Banking demo is HIS exact use case.** Regulated finance, 4M+ users — one hallucinated stat = compliance incident. Alice overdraft + frozen account = his demo moment. |
| **Dharmendra Singh** | Walmart (prev) | Judged "AI Agent" challenge before — knows the agent security space |
| **Neha Manjunath** | Hippocratic AI | Healthcare AI, highest-stakes domain — HIPAA regulations in L2 speak directly to her |
| **Nichol Bradford** | SHRM, human-centric AI | "Alignment isn't enough — you need epistemic verification + compliance" |
| **Hari Kanagala** | GPM AI/ML, RB Global | Gemini/Vertex adjacent — validates our Gemini 2.5 Flash choice |

### Logistics
- [x] Registered on lablab.ai
- [ ] Available May 18 (hybrid build day — San Jose or online)
- [ ] Available May 19 (demo day — winners present live on stage, San Jose McEnery Convention Center)
- [x] Built within hackathon window (May 11-19)

### Track 1 Judging Criteria Alignment
| Criterion | Weight Signal | Our Evidence |
|-----------|--------------|--------------|
| **Completion** | High | 9-scenario suite, 6 rounds red team, banking compliance demo, production-deployed |
| **Technology Integration** | High | Lobster Trap (22 fields + YAML policy + 10-stage normalization chain) + 4 LLM providers + L2 compliance (15 regulations) |
| **Business Value** | High | Banking compliance demo with ledger cross-reference. Regulated finance use case. Measurable risk reduction (0%→100%). Audit trail a JP Morgan SVP can read. |
| **Presentation** | High | Live demo URL, Banking Mode toggle, Ledger popup, AI Interpretation, interactive 3-layer console |
| **Originality** | Medium | Only system combining DPI + epistemic verification + regulatory compliance in one pipeline. SPT framework is novel. |
| **Realistic Impact** | Medium | Deployed on Fly.io, sub-15ms Layer 0, ~$0.01/audit Layer 1+2, banking-grade demo |

### Prize: Track 1
- DGX Spark (NVIDIA) + Veea DevKit
- TerraFabric pilot access
- Co-authored writeup amplified across Veea channels
- Direct intro to Veea engineering team
- Stage recognition at AI & Big Data Expo (May 19)

---

*GEM².AI — TechEX Hackathon Track 1: Agent Security & AI Governance (Powered by Veea)*
*May 2026 | David Seo | david@gineers.ai*
