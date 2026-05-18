# Demo Action Plan: Health Insurance Claim Pipeline
## GEM2-Crafter x Vultr Serverless Inference x Gemini

**Created:** 2026-05-15
**Deadline:** 2026-05-19 16:00 CEST
**Event:** Milan AI Week 2026 — AI Agent Olympics
**Tracks:** Vultr + Google

---

## Core Thesis

**"We didn't build a better agent. We built the fence that makes agents trustworthy."**

- Gemini (Google) = Wolfi — Architect (Phase 1), then Auditor + Orchestrator (Phase 2)
- Open-source LLM on Vultr Serverless Inference = Sheep/Sub-agents = conducts the contracts (Phase 2)
- TPMN contracts = the domain knowledge — LLM-agnostic, mathematically verifiable
- The contract IS the doctor, not the model
- **The sheepdog never sleeps** — Gemini is present in BOTH phases, its role shifts
- **AI monitors AI, AI audits AI. Human at the edge.** Wolfi is the delegated user — the sheepdog. Open-source LLM is sheep — isolated, independent micro-service.
- Within the contract boundary, **the model cannot hallucinate a decision.** It can only execute verified logic. (This lands with every CTO scared of hallucinations in production.)

### Mathematical Edge — Judge-Ready Definitions

Don't say "89 postconditions." Say:

> **"89 things that cannot go wrong when processing a health insurance claim. Each one is a protection for the patient."**

- **Computable** — the model can always execute it, no ambiguity
- **Falsifiable** — you can prove a violation happened, not just claim it
- **Provable** — correct execution can be independently verified after the fact

### Compliance Product Angle (Kobie)

Health insurance has regulators. TPMN gives contract execution logs that are **human-readable AND machine-verifiable**. This isn't a demo feature — it's a compliance product. Judges from enterprise backgrounds will immediately see the procurement path.

---

## Two-Phase Architecture

### Phase 1: BUILD (Gemini/Wolfi — One-time Architect Work)

**Main takeaway: Autonomous AI-Driven Workflow system creation.**

Gemini reads the 6 TPMN contracts from `tpmn-contracts/health-insurance-claim/`, decomposes the work, scaffolds the execution pipeline, wires up synthetic data as reference databases, and sets up the 89 postcondition verification gates.

**Gemini's role — ARCHITECT:**
- Parse contract definitions (A, F, B, P for each of 6 contracts)
- Decompose into executable unit-works
- Scaffold the pipeline: intake -> policy-verification -> eligibility -> medical-review -> adjudication -> disbursement
- Wire synthetic DB files as runtime context for each contract
- Configure postcondition checklist per contract
- Deploy the runnable system on Vultr VPS

**Why Gemini:** Long context, deep reasoning, tool calling — architect-level work. Satisfies **Google track** (Gemini API usage).

```
         Wolfi (Gemini) — ARCHITECT
              |
    creates TPMN contracts (green)
    scaffolds pipeline
    wires synthetic DBs
    sets postcondition gates
              |
    A --> [Intake] --> [Policy Verify] --> ... --> [Disbursement]
              ^              ^                         ^
              |              |                         |
         TPMN Contract: Unit-work-stage based on Business Knowledge
         Mathematical Edge: Computable, Falsifiable, Provable
```

### Phase 2: RUN (Gemini/Wolfi as Auditor+Orchestrator, Vultr LLM/Sheep as Conductors)

**Gemini's role CHANGES — it becomes Auditor AND Orchestrator.** It does not disappear. The sheepdog stays, patrolling the fence.

The sheep (open-source LLM on Vultr) **conduct** each contract — they do the work. Gemini **orchestrates** the pipeline (routes claim data from sheep to sheep) and **audits** every output (verifies postconditions before passing to the next gate).

**Gemini's role — AUDITOR + ORCHESTRATOR:**
- Routes claim input (A) to the first sheep
- After each sheep produces output, Gemini verifies postconditions (P)
- If postconditions pass → Gemini passes output as input to the next sheep
- If postconditions fail → Gemini flags the failure, halts or retries
- After final sheep (claim-06) → Gemini confirms all 89 postconditions passed → output (B)
- Gemini owns the pipeline flow and the verification gates

**Open-source LLM's role — CONDUCTOR (Sheep):**
- Receive structured input (claim data + relevant synthetic DB context)
- Apply contract rules (regex, arithmetic, lookups, threshold checks)
- Produce compliant JSON output matching CONTRACT.B schema
- Does NOT verify its own output — that is the Wolfi's job

**6 sheep, one per contract:**
- claim-01 Intake → `Kimi-K2.6` (fast, regex/validation — $0.15/$0.60)
- claim-02 Policy Verify → `Kimi-K2.6` (structured lookup — $0.15/$0.60)
- claim-03 Eligibility → `Kimi-K2.6` (table lookup + arithmetic — $0.15/$0.60)
- claim-04 Medical Review → `DeepSeek-V3.2-NVFP4` (most complex reasoning — $0.55/$1.65)
- claim-05 Adjudication → `Kimi-K2.6` (financial math — $0.15/$0.60)
- claim-06 Disbursement → `Kimi-K2.6` (validation + cross-check — $0.15/$0.60)

**Why this separation matters:**
- The sheep executes. The Wolfi verifies. Separation of execution and audit.
- No agent marks its own homework — the postcondition gate is external to the executor.
- Swap any sheep (change the model) — the Wolfi still verifies the same 89 postconditions.

```
         Wolfi (Gemini) — AUDITOR + ORCHESTRATOR
         ........|..............|................|........
         .       v              v                v      .
  A --> [Intake] --> [Policy Verify] --> ... --> [Disbursement] --> B
         sheep 1      sheep 2                    sheep 6
         Kimi-K2.6    Kimi-K2.6                 Kimi-K2.6
              ^              ^                         ^
              |              |                         |
         Sheep "conducts" contract
         Wolfi verifies postconditions at every gate (dotted lines)
         The sheepdog never sleeps
```

**Why open-source LLM:** Fast, cheap, replaceable — proves LLM-agnostic governance. Satisfies **Vultr track** (Vultr Serverless Inference usage).
**Why Gemini stays:** The orchestrator and auditor must be capable of deep reasoning to verify complex postconditions (89 total). Gemini's continued presence satisfies **Google track** throughout the entire runtime, not just build time.

---

## Demo Workflow: Health Insurance Claim Pipeline

**Source:** `https://github.com/gem-squared/tpmn-contracts/tree/june/health-insurance-claim`

### 6 Contracts, 89 Postconditions

```
claim-01 Intake (12 postconditions)
    |  Policy format, ID format, date sanity, document completeness
    v
claim-02 Policy Verification (12 postconditions)
    |  Policy existence, identity match, active status, premium arrears, duplicate check
    v
claim-03 Eligibility Check (15 postconditions)
    |  Coverage type, waiting period, annual/lifetime limits, ICD-10 exclusion screening
    v
claim-04 Medical Review (16 postconditions)
    |  Provider accreditation, ICD-10/CPT validation, pre-auth, bill benchmark, physician licence
    v
claim-05 Adjudication (19 postconditions)
    |  Deductible -> co-pay -> co-insurance -> net payable (conservation invariant)
    v
claim-06 Disbursement (15 postconditions)
    |  Payment validation, anti-fraud cross-check, ledger updates, reference finalisation
    v
CLAIM PROCESSED — 89 postconditions verified
```

### Contract Complexity & Model Assignment

| Contract | LLM Task | Medical Knowledge? | Vultr Model |
|----------|----------|--------------------|-------------|
| claim-01 Intake | Regex, date math, doc checklist | No — rules in contract | `vultr/Kimi-K2.6` |
| claim-02 Policy Verify | DB lookup, identity match | No — lookup logic | `vultr/Kimi-K2.6` |
| claim-03 Eligibility | Table lookup, limit arithmetic | No — tables in contract | `vultr/Kimi-K2.6` |
| claim-04 Medical Review | ICD-10/CPT cross-ref, benchmark | Partial — code lists provided | `vultr/DeepSeek-V3.2-NVFP4` |
| claim-05 Adjudication | Financial waterfall math | No — formulas in contract | `vultr/Kimi-K2.6` |
| claim-06 Disbursement | Payment validation, anti-fraud | No — rules in contract | `vultr/Kimi-K2.6` |

**Key insight:** 5 of 6 contracts use the cheapest/fastest model. Only claim-04 (ICD-10/CPT plausibility) needs heavier reasoning. The contract contains the domain knowledge, not the LLM.

### Synthetic Data (Pre-built, Ready to Demo)

**5 claim scenarios:**
- `claim_A001_full_pipeline.json` through `claim_A005_full_pipeline.json`

**5 reference databases:**
- `db_policies.json` — policy records (policy_no, status, dates, product codes)
- `db_providers.json` — accredited medical providers
- `db_physicians.json` — physician registry (licence, specialty, status)
- `db_plan_benefits.json` — plan coverage details (limits, deductibles, co-pay)
- `db_pre_auth_and_utilisation.json` — pre-authorisations + claim utilisation history

---

## Vultr Serverless Inference Integration

### API Details

- **Endpoint:** `https://api.vultrinference.com/v1`
- **Compatibility:** Fully OpenAI-compatible (drop-in baseURL swap)
- **Auth:** `Authorization: Bearer $VULTR_SERVERLESS_INFERENCE_API_KEY`
- **Hackathon credits:** $200 per participant

### Available Models (Verified from Vultr Serverless Inference Catalog — 2026-05-15)

**IMPORTANT:** Model names must match EXACT Vultr API model IDs. Verified from catalog screenshot.

| Model | Input $/M | Output $/M | Best For |
|-------|-----------|------------|----------|
| `Llama-3.1-Nemotron-Safety-Guard-8B-v3` | $0.01 | $0.01 | Safety guard (cheapest) |
| `Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16` | $0.13 | $0.38 | Budget reasoning |
| `Kimi-K2.6` | $0.15 | $0.60 | **Default sheep** — fast worker |
| `Nemotron-Cascade-2-30B-A3B` | $0.15 | $0.60 | Fast worker (alternative) |
| `MiniMax-M2.7` | $0.30 | $1.20 | Balanced |
| `Qwen3.5-397B-A17B-FP8` | $0.30 | $1.20 | Large reasoning (397B MoE) |
| `DeepSeek-V3.2-NVFP4` | $0.55 | $1.65 | **Deep reasoning** — Tier 3 Wolfi fallback |
| `GLM-5.1-FP8` | $0.85 | $3.10 | Premium |

**NOTE:** Previous model names (llama-3.3-70b-instruct-fp8, deepseek-r1-distill-llama-70b, qwen2.5-32b-instruct, gpt-oss-120b) are NOT in the current Vultr catalog. Use exact IDs above.

### Go Integration Pattern

```go
// Vultr Serverless Inference — OpenAI-compatible
func vultrSheepCall(apiKey, model, systemPrompt, userPrompt string) (string, error) {
    endpoint := "https://api.vultrinference.com/v1/chat/completions"
    payload := map[string]any{
        "model": model,  // e.g., "Kimi-K2.6"
        "messages": []map[string]string{
            {"role": "system", "content": systemPrompt},
            {"role": "user", "content": userPrompt},
        },
        "temperature": 0.1,  // low temp for deterministic contract execution
        "response_format": map[string]string{"type": "json_object"},
    }
    // POST with Authorization: Bearer apiKey
}
```

### Model Routing Logic

```go
func selectVultrModel(contractID string) string {
    switch contractID {
    case "claim-04":  // medical review — needs deeper reasoning
        return "DeepSeek-V3.2-NVFP4"
    default:          // all other contracts — reliable + fast
        return "Kimi-K2.6"
    }
}
```

### LLM Fallback Chain (3-tier Wolfi Safety)

```
Tier 1: gemini-2.5-pro (primary Wolfi)
Tier 2: gemini-2.5-flash (Google fallback)
Tier 3: DeepSeek-V3.2-NVFP4 on Vultr (last resort, no Google dependency)
```

---

## Sponsor Alignment

### Google Track

| Requirement | How We Satisfy |
|-------------|---------------|
| Use Gemini API | Phase 1: Gemini = Architect (builds system). Phase 2: Gemini = Auditor + Orchestrator (verifies every output) |
| Multi-step agentic workflows | 6-contract pipeline with TPMN governance, Gemini present at every gate |
| Intelligent reasoning | Phase 1: decomposes contracts, scaffolds pipeline. Phase 2: verifies 89 postconditions per claim |
| Function calling / tool use | Gemini tool_call for file creation, DB wiring, postcondition verification |

### Vultr Track

| Requirement | How We Satisfy |
|-------------|---------------|
| Deploy on Vultr | VPS at 173.199.92.236 |
| Central system of record | Workspace, artifacts, state on Vultr VPS |
| Use Vultr products | Vultr Serverless Inference for sub-agent LLMs |
| Production-style web app | GEM2-Crafter web UI with live pipeline execution |
| Enterprise workflows | Health insurance claim — 6 contracts, 89 postconditions |

### Dual-LLM Pitch Narrative

```
Phase 1: "Gemini builds the factory."
Phase 2: "Open-source LLM runs the assembly line.
          Gemini inspects every product off the line.
          The contracts are the blueprints.
          Swap the worker — the inspector and the blueprints remain.
          The sheepdog never sleeps."
```

---

## Implementation Steps

### Step 1: Vultr Serverless Inference Client (Go)

- [ ] Add `vultrInferenceCall()` function to `console/executor.go`
- [ ] OpenAI-compatible HTTP client (POST /chat/completions)
- [ ] Model routing: `selectVultrModel(contractID)` -> Kimi-K2.6 or DeepSeek-V3.2-NVFP4
- [ ] Add `VULTR_INFERENCE_API_KEY` env var support
- [ ] Low temperature (0.1) for deterministic contract execution
- [ ] JSON response format enforcement

### Step 2: Sheep Registry

- [ ] Define sheep registry as YAML/JSON config file (e.g., `sheep-registry.yaml`)
- [ ] Each entry: id, model, endpoint, tier, active_params, strengths, cost
- [ ] Pre-configure 4 sheep: sheep-default (Kimi-K2.6), sheep-reasoning (DeepSeek-V3.2-NVFP4), sheep-fast (Nemotron-Cascade-2-30B-A3B), sheep-heavy (Qwen3.5-397B-A17B-FP8)
- [ ] Define 3 presets: Budget (all fast), Standard (one reasoning), Premium (multi reasoning)
- [ ] Load registry into Gemini context during Phase 1 build
- [ ] Wolfi reads registry + contract complexity → assigns sheep per contract
- [ ] Assignment stored in pipeline config (not hardcoded in Go)

### Step 3: TPMN Contract Loader

- [ ] Clone/fetch `tpmn-contracts` health-insurance-claim contracts into workspace
- [ ] Parse 6 contract .md files -> extract A, F, B, P sections
- [ ] Load synthetic data JSON files as reference context
- [ ] Wire contract chain: output of N becomes input of N+1

### Step 4: Contract Execution Pipeline (Wolfi + Sheep Loop)

- [ ] Build pipeline executor: claim-01 -> claim-02 -> ... -> claim-06
- [ ] For each contract (the Wolfi-Sheep loop):
  1. **Wolfi (Gemini) orchestrates:** assembles input for the sheep (claim data + DB context)
  2. **Sheep (Vultr LLM) conducts:** receives prompt with contract rules (F) + input (A), produces output (B)
  3. **Wolfi (Gemini) audits:** verifies postconditions (P) against sheep's output
  4. **Gate decision:** postconditions pass → Wolfi passes output to next sheep. Fail → halt/retry.
- [ ] Gemini calls at every gate: verify postconditions (requires reasoning depth)
- [ ] Vultr calls at every contract: execute the work (fast, cheap)
- [ ] Collect execution trace: per-contract timing, which model (sheep), postcondition results (Wolfi audit)
- [ ] Surface 89 postcondition results in UI with pass/fail per gate

### Step 5: LLM Dropdowns — Vultr Models

- [ ] **CRAFT LLM dropdown:** Add DeepSeek-V3.2-NVFP4, Qwen3.5-397B-A17B-FP8
- [ ] **Agent LLM dropdown:** Add all 8 Vultr models under "Vultr Serverless Inference" group:
  - vultr/Llama-3.1-Nemotron-Safety-Guard-8B-v3 ($0.01/$0.01)
  - vultr/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16 ($0.13/$0.38)
  - vultr/Kimi-K2.6 ($0.15/$0.60) — recommended default
  - vultr/Nemotron-Cascade-2-30B-A3B ($0.15/$0.60)
  - vultr/MiniMax-M2.7 ($0.30/$1.20)
  - vultr/Qwen3.5-397B-A17B-FP8 ($0.30/$1.20)
  - vultr/DeepSeek-V3.2-NVFP4 ($0.55/$1.65)
  - vultr/GLM-5.1-FP8 ($0.85/$3.10)
- [ ] Frontend sends `agent_model` to backend (already wired)
- [ ] Backend routes to Vultr endpoint when agent_model starts with "vultr/"

### Step 6: Demo Scenario — End-to-End Claim

- [ ] Pre-load synthetic claim (claim_A001) as demo input
- [ ] Show Phase 1: Gemini reads contracts, decomposes into 6 unit-works
- [ ] Show Phase 2: Open-source LLM executes each contract sequentially
- [ ] Show: Postcondition verification at each gate (89 total)
- [ ] Show: Adjudication waterfall (claim-05) with conservation invariant
- [ ] Show: Final claim reference upgrade (DRAFT -> CLM-YYYY-#######)
- [ ] Show: Complete audit trail in work plan

### Step 7: Video + Pitch Deck (Final Day)

- [ ] Record 5-min video: problem -> solution -> live demo -> why it matters
- [ ] Pitch narrative: "From Vibe-Coding to Edge-Coding"
- [ ] Key demo moments:
  - Gemini builds the pipeline (Phase 1)
  - Kimi-K2.6 on Vultr executes contracts (Phase 2)
  - claim-05 adjudication math verified on screen
  - 89/89 postconditions pass
  - "Swap the LLM, the contracts still hold"
- [ ] Submit before 2026-05-19 16:00 CEST

---

## Demo Script (5 minutes)

### Act 1: The Problem (60s)
- "This is how most people build multi-agent systems — monkeys in mesh mode"
- "No contracts, no boundaries, no guarantees — vibe-coding"
- "Scale it up: more agents, more chaos. Entropy always wins."

### Act 2: The Solution (60s)
- "What if agents had mathematical contracts instead of vibes?"
- Phase 1: "Gemini is the Wolfi — the sheepdog that BUILDS the system"
- Phase 2: "The Wolfi's role shifts — now it's the Auditor AND Orchestrator"
- "Open-source LLM on Vultr is the sheep — CONDUCTS the contract within the fence"
- "Within the contract boundary, the model cannot hallucinate a decision."
- "89 things that cannot go wrong when processing a health insurance claim. Each one is a protection for the patient."
- Spell out: **Computable** (no ambiguity), **Falsifiable** (prove violations), **Provable** (independently verify)

### Act 3: Live Demo (150s)
1. **Phase 1 — BUILD:** Show Gemini reading the 6 health insurance claim contracts
2. Gemini scaffolds the pipeline, wires synthetic data, configures postcondition gates
3. **Phase 2 — RUN:** Feed claim_A001 into the pipeline
4. Watch: sheep (Kimi-K2.6 on Vultr) conducts claim-01 Intake → Wolfi (Gemini) audits → PASS
5. Repeat through all 6 contracts: sheep conducts, Wolfi audits, gate passes
6. Highlight claim-05: `net_payable + claimant_liability = claim_amount_requested` — Wolfi VERIFIED
7. Show: "89 protections for the patient — each one computable, falsifiable, provable" — 89/89 PASSED
8. Show: audit trail — human-readable AND machine-verifiable. Compliance product, not demo feature.

### Act 4: Why This Matters (30s)
- "Within the contract boundary, the model cannot hallucinate a decision. It can only execute verified logic."
- "AI monitors AI. AI audits AI. Human stays at the edge."
- "The execution logs are human-readable AND machine-verifiable — regulators can read them."
- "Swap the sheep — Gemini still verifies the same 89 protections for the patient."
- "We didn't build a better agent. We built the fence that makes agents trustworthy."

---

## Sheep Registry & Click-to-Build Vision

### Concept: Pre-defined Sheep as API Configurations

The 6 Vultr LLM endpoints are pre-defined in a **sheep registry** — a manifest that declares each available model's capabilities, cost tier, and API configuration. During Phase 1, the Wolfi (Gemini) reads this registry and intelligently assigns sheep to contracts based on complexity requirements.

### Sheep Registry Structure

```yaml
sheep_registry:
  - id: "sheep-default"
    model: "Kimi-K2.6"
    endpoint: "https://api.vultrinference.com/v1"
    tier: "standard"
    cost_input: 0.15
    cost_output: 0.60
    strengths: ["instruction-following", "json-output", "general-purpose", "fast"]

  - id: "sheep-reasoning"
    model: "DeepSeek-V3.2-NVFP4"
    endpoint: "https://api.vultrinference.com/v1"
    tier: "premium"
    cost_input: 0.55
    cost_output: 1.65
    strengths: ["complex-reasoning", "medical-codes", "cross-referencing", "multi-factor-analysis"]

  - id: "sheep-fast"
    model: "Nemotron-Cascade-2-30B-A3B"
    endpoint: "https://api.vultrinference.com/v1"
    tier: "budget"
    cost_input: 0.15
    cost_output: 0.60
    strengths: ["fast", "structured-output", "arithmetic", "validation"]

  - id: "sheep-heavy"
    model: "Qwen3.5-397B-A17B-FP8"
    endpoint: "https://api.vultrinference.com/v1"
    tier: "premium"
    cost_input: 0.30
    cost_output: 1.20
    strengths: ["large-model", "397B-MoE", "complex-reasoning", "deep-analysis"]
```

**NOTE:** All model IDs verified from Vultr Serverless Inference catalog screenshot (2026-05-15). 8 models total available.

### Phase 1: Wolfi Reads Registry, Assigns Sheep

During BUILD, Gemini sees the sheep registry and makes routing decisions:

```
Wolfi reads:  6 contracts (complexity) + sheep registry (capabilities)
Wolfi decides:
  claim-01 Intake (regex/validation)      → sheep-default (Kimi-K2.6)
  claim-02 Policy Verify (structured)     → sheep-default (Kimi-K2.6)
  claim-03 Eligibility (arithmetic)       → sheep-default (Kimi-K2.6)
  claim-04 Medical Review (complex)       → sheep-reasoning (DeepSeek-V3.2-NVFP4)
  claim-05 Adjudication (financial math)  → sheep-default (Kimi-K2.6)
  claim-06 Disbursement (validation)      → sheep-default (Kimi-K2.6)
```

The assignment is NOT hardcoded — Gemini reasons about it from the registry. Change the registry, re-run Phase 1, the assignments adapt.

### Click-to-Build: Same Contracts, Different Sheep = Different Systems

```
┌──────────────────────────────────────────────┐
│  Pick workflow:   [Health Insurance Claim ▼]  │  ← from tpmn-contracts library
│  Pick sheep tier: [Budget ▼]                  │  ← sheep registry preset
│                   [Standard ▼]                │
│                   [Premium ▼]                 │
│                                              │
│  [BUILD]                                     │
└──────────────────────────────────────────────┘
```

| Preset | Sheep Assignment | Target Customer |
|--------|-----------------|-----------------|
| **Budget** | All 6 contracts → Nemotron-Cascade-2-30B-A3B (fast, $0.15) | Small insurer, cost-sensitive |
| **Standard** | claim-04 → DeepSeek-V3.2-NVFP4, rest → Kimi-K2.6 | Mid-market insurer |
| **Premium** | claim-03,04,05 → DeepSeek-V3.2-NVFP4, rest → Qwen3.5-397B-A17B-FP8 | Large insurer, accuracy-critical |

Same contracts, same postconditions, same governance. Different sheep = different cost/accuracy profile. One click.

### Beyond Healthcare: Same Sheep, Different Contracts = Different Industries

```
┌──────────────────────────────────────────────┐
│  Pick workflow:   [Loan Approval ▼]           │
│                   [Customer Support ▼]        │
│                   [Procurement ▼]             │
│                   [P2P Auction ▼]             │
│                   [Health Insurance Claim ▼]  │
│                                              │
│  Pick sheep tier: [Standard ▼]                │
│                                              │
│  [BUILD]                                     │
└──────────────────────────────────────────────┘
```

The Wolfi reads different contracts from `tpmn-contracts`, assigns sheep from the same registry, scaffolds a completely different pipeline. The governance layer is universal.

**Product vision line:** "One click to build a governed enterprise workflow. Change the sheep, change the cost profile. Change the contracts, change the industry. The Wolfi and the fence remain."

---

## Key Differentiators

| | Vibe-Coding | GEM2-Crafter |
|--|-------------|--------------|
| Agent governance | None | 89 protections for the patient |
| Domain knowledge | In the LLM (hope it knows medicine) | In the CONTRACT (verifiable) |
| Hallucination risk | Model can hallucinate any decision | Within contract boundary, cannot hallucinate a decision |
| Verification | Manual review | Automated postcondition gate — computable, falsifiable, provable |
| LLM dependency | Locked to one provider | Any model executes the contract |
| Audit trail | Chat logs | Human-readable AND machine-verifiable execution logs |
| Compliance | Trust the AI | Regulators can read the logs — compliance product, not demo |
| Scaling | More agents = more chaos | More contracts within boundaries |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vultr model unavailable | 3-tier fallback: gemini-2.5-pro → gemini-2.5-flash → DeepSeek-V3.2-NVFP4 on Vultr |
| Gemini 503 (high demand) | Auto-fallback to flash, then Vultr. Already implemented in `callCrafterForSituation` |
| Model name mismatch | Verified from catalog screenshot 2026-05-15. Use exact IDs: Kimi-K2.6, DeepSeek-V3.2-NVFP4, etc. |
| Cold start latency in demo | Warm up models with ping request before presentation |
| Credit burn ($200 limit) | Use Nemotron-Cascade-2-30B-A3B ($0.15) for dev; reserve Kimi-K2.6/DeepSeek for demo |
| Synthetic data parsing issues | Test all 5 scenarios (A001-A005) before recording |
| Contract output schema mismatch | Enforce `response_format: json_object` + schema in system prompt |

---

## File References

| Asset | Location |
|-------|----------|
| TPMN Contracts | `github.com/gem-squared/tpmn-contracts/tree/june/health-insurance-claim` |
| Synthetic Claims | `health-insurance-claim/synthetic data/claim_A00{1-5}_full_pipeline.json` |
| Reference DBs | `health-insurance-claim/synthetic data/db_*.json` |
| Executor Engine | `console/executor.go` |
| HTTP Handlers | `console/crafter_handlers.go` |
| Web UI | `console/static/index.html`, `crafter-app.js`, `crafter.css` |
| Pitch Strategy | `Docs/pitch-deck-strategy.md` |
| Deploy Target | `173.199.92.236` (Vultr VPS) |

---

## Visual References

| Diagram | Source |
|---------|--------|
| Phase 1: BUILD (Wolfi as Architect) | Screenshot 2026-05-15 at 13.32.52.png |
| Phase 2: RUN (Wolfi as Auditor + Sheep as Conductors) | Screenshot 2026-05-15 at 13.33.07.png |

---

*Action plan v1.3 | AI Agent Olympics | GEM2.AI — models verified 2026-05-15*
