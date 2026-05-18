# Pitch Deck Strategy
## "From Vibe-Coding to Edge-Coding"
### GEM²-Crafter: Mathematical contract-based workflow orchestration at the edge

**Event:** Milan AI Week 2026 — AI Agent Olympics
**Tracks:** Vultr + Google
**Format:** 5-min video + live demo + GitHub repo
**Deadline:** May 19, 16:00 CEST

---

## Narrative Arc (5 minutes)

### Act 1: The Problem (60s)

**Slide 1 — "Kobie's Monkeys in mesh mode"**
- This is how most people build multi-agent systems today
- Agents talk in prose, share corpus without boundaries
- "Vibe-coding" — it works for demos, breaks in production
- Key phrase: "No contracts, no boundaries, no guarantees"

**Slide 2 — "Very hard to control Entropy"**
- Scale it up: more agents, more corpora, more chaos
- Each agent hallucinates independently, no verification gate
- Nobody knows if the output is correct, complete, or safe
- Key phrase: "The monkey problem — entropy always wins"

**Transition:** "What if agents had mathematical contracts instead of vibes?"

### Act 2: The Solution (90s)

**Slide 3 — "David's Wofis at the Edge"**
- Introduce the sheepdog/sheep model
- Wolfi (AI-pilot) = orchestrator with sovereignty over the workflow
- Sheep (sub-agents) = workers bounded by formal contracts
- A → B = input state transforms to output state, mathematically defined
- F = mandate area — agents have freedom WITHIN the contract, not outside
- Mathematical Edge: computable, falsifiable, provable
- Key phrase: "The contract IS the fence"

**Slide 4 — "Entropy Managed"**
- Show how this scales without losing coherence
- Horizontal: multiple wolfi instances managing separate chains
- Vertical: more sub-agents within larger mandate areas
- The X: you don't scale by loosening contracts
- Key phrase: "Scale the agents, not the chaos"

**Slide 5 — TPMN Lifecycle**
- Init → Plan → Execute → Verify → Deploy
- Each stage is a skill with its own contract (A → B | P)
- verify-work = acceptance gate (CONTRACT.B satisfied?)
- GEM² truth-filter = epistemic audit (is this actually true?)
- Key phrase: "Every output is verified before it moves forward"

### Act 3: The Demo (120s)

**Live demo on Vultr VPS (http://173.199.92.236)**

Demo flow:
1. Create project: "Build a weather dashboard"
2. Show: AI-pilot decomposes into unit-works with contracts
3. Show: Pipeline animation (I → P → E → V → D)
4. Show: Auto-proceed executing each unit mechanically
5. Show: Verify-work checking each unit against its contract
6. Show: Deploy — live URL served from Vultr
7. Show: Explorer tab — artifact traceability (files, sizes, paths)
8. Show: Work plan file — complete audit trail from plan to verified output

Key moments to highlight:
- "The AI-pilot planned 5 units, each with a formal contract"
- "Watch the executor — zero LLM calls between steps, purely mechanical"
- "Verify-work just checked every output against its contract — 5/5 SUCCESS"
- "The work plan IS the audit trail — every decision, every artifact, traceable"

### Act 4: Why This Matters (30s)

**Slide 6 — The Edge**
- Vibe-coding: fun for prototypes, dangerous for production
- Edge-coding: mathematical guarantees at the execution boundary
- LLM-agnostic: same governance works with Gemini, Claude, GPT, any model
- The value: not the LLM, not the agent — the CONTRACT between them

**Closing line:** "We didn't build a better agent. We built the fence that makes agents trustworthy."

---

## Track-Specific Angles

### Vultr Track
- Deployed on Vultr VPS (173.199.92.236)
- Production-style web application with multi-step agentic workflows
- Vultr as central system of record (workspace, artifacts, state)
- Emphasize: real deployment, real server, real files — not a notebook demo

### Google Track
- Built on Gemini 2.5 Flash/Pro via Gemini API
- Dual LLM selection: Crafter LLM (pilot) + Agent LLM (workers)
- Function-calling for file creation (Gemini tool use)
- Multi-step agentic workflows with Gemini reasoning

---

## Key Differentiators vs Competitors

| Feature | Vibe-Coding Tools | GEM²-Crafter |
|---------|-------------------|--------------|
| Agent governance | None — hope for the best | Formal contracts (A → B \| P) |
| Verification | Manual review | Automated verify-work gate |
| Traceability | Chat logs | Structured work plans with artifact paths |
| Scaling | More agents = more chaos | More agents within contract boundaries |
| LLM lock-in | Single provider | LLM-agnostic (Gemini, Claude, GPT) |
| Epistemic audit | None | GEM² truth-filter (external SaaS) |

---

## Submission Checklist

- [ ] Title (max 50 chars): "GEM²-Crafter: Edge-Coding Orchestrator"
- [ ] Short description (max 255 chars)
- [ ] Long description (min 100 words)
- [ ] Track selection: Vultr + Google
- [ ] Technologies: Go, Gemini API, Vultr VPS, TPMN
- [ ] Cover image (16:9) — use Wofis diagram
- [ ] Video (max 5 min, max 300MB)
- [ ] GitHub repo (public, MIT license)
- [ ] Live demo URL: http://173.199.92.236

---

## Visual Assets for Slides

| Slide | Image | Source |
|-------|-------|--------|
| 1 | Kobie's Monkeys in mesh mode | Screenshot 2026-05-15 at 03.42.36.png |
| 2 | Very hard to control Entropy | image.png |
| 3 | David's Wofis at the Edge | Screenshot 2026-05-15 at 03.44.41.png |
| 4 | Entropy Managed | Screenshot 2026-05-15 at 03.45.38.png |
| 5 | TPMN Pipeline (I→P→E→V→D) | Live demo screenshot |
| 6 | Live demo — deploy result | Live demo screenshot |

---

## Talking Points Cheat Sheet

**If asked "How is this different from CrewAI/AutoGen/LangGraph?"**
> Those are agent frameworks — they help you BUILD agents. We built the governance layer that makes agents TRUSTWORTHY. You can use CrewAI inside a TPMN mandate area. We're not competing with frameworks, we're the verification layer on top.

**If asked "What's the mathematical edge?"**
> Every contract is falsifiable — verify-work can objectively determine SUCCESS or FAILURE against CONTRACT.B. It's not a vibe check, it's a formal gate. The GEM² truth-filter adds epistemic scoring on top — is this output actually true, not just contractually compliant?

**If asked "Why LLM-agnostic?"**
> The governance should outlive any single model. Gemini today, something better tomorrow. The contracts don't change when the model changes. That's the point — the fence is independent of the sheep inside it.

**If asked "Can this work in enterprise?"**
> That's the design target. Every work plan is an audit trail. Every artifact has a verified path. Every output passed a contract gate. Compliance teams can read the work plan and trace every decision. Show them the WP-ST-1 Flappy Bird example — from contract to verified artifact paths.
