# CLAUDE.md — TechEx (GEM² + Lobster Trap)

**Version:** v0.1.0 (forked from AI-agent-olympics) | **Updated:** 2026-05-18

---
## CANNONICAL DIRECTIVE, YOU MUST OBEY ##
**No ad-hoc execution. NEVER jump into implementation without triggering the matching skill first.**

---

## Project Identity

**TechEx — GEM² + Lobster Trap: Two-Layer AI Governance**
TechEX Hackathon 2026 · Track 1: Agent Security & AI Governance (Powered by Veea).

Forked from AI-agent-olympics. Same TPMN/CE/audit-gate machinery; adds Lobster Trap **L0 (ingress)** and **L3 (egress)** layers around the existing L1/L2 truth-filter audit. Each workflow node now runs L0 → L1 → F → L2 → L3.

**Module:** `github.com/gem-squared/TechEx`
**Binary:** `gem2-techex` (port 8081 — sibling to gem2-crafter on 8080)
**Stack:** Go 1.25 | Vultr DeepSeek-V3.2 (CE Agent + LT canonicalizer) | Gemini (L1/L2 audit-gate) | Veea Lobster Trap policy

---

## Git Commit Convention
```bash
git commit -m "{Detailed message}

Date: $(date +"%Y-%m-%d %H:%M:%S %Z")
Author: David Seo of GEM².AI"
```

---

## Build / Run

```bash
# Build
go build -o gem2-techex ./console/

# Run (port 8081 to coexist with gem2-crafter on 8080)
export VULTR_INFERENCE_API_KEY="your-vultr-key"
export GEM2_API_KEY="your-gem2-key"
export GEMINI_API_KEY="your-gemini-key"
export AUTH_KEYS="comma,separated,keys"
export PORT=8081
./gem2-techex

# Linux cross-compile (VPS deploy at /opt/gem2-techex/)
GOOS=linux GOARCH=amd64 go build -o gem2-techex-linux ./console/
```

## Deploy

VPS `/opt/gem2-techex/` on 173.199.92.236 — sibling service to gem2-crafter.
Separate systemd unit `gem2-techex.service`, port 8081, separate `.gem-squared/`
workspace dir.

---
## CANNONICAL DIRECTIVE, YOU MUST OBEY ##
**No ad-hoc execution. NEVER jump into implementation without triggering the matching skill first.**

---

## Session Protocol

Trigger `/init-session` on every session start. The skill handles all bootstrap logic.

---

## Skill Trigger Pattern

**No ad-hoc execution. NEVER jump into implementation without triggering the matching skill first.**

| Situation | Skill |
|-----------|-------|
| Session start, context compaction | `/init-session` |
| Want status, counters, what's pending | `/check-session` |
| Search prior art | `/search-kg` |
| Discover installed skills | `/search-skill` |
| Sweep/restore non-core skills | `/skill-to-kg` |
| New work request, decomposition needed | `/plan-work` |
| Ready to execute a planned unit-work | `/proceed-work` |
| Need to add, modify, abort, or reorder units in a live WP | `/update-work-plan` |
| All units done, need acceptance gate | `/verify-work` |
| External epistemic verification (L2) | `/verify-by-gem2` |
| Verified work ready to finalize + commit | `/archive-work` |
| Extract proven WP as reusable skill | `/extract-skill` |
| Done for now, save state for next session | `/end-session` |

### Mandatory Execution Rule

**ALL implementation work MUST flow through `/proceed-work`.** No exceptions.

If no WP exists for the work → `/plan-work` first, then `/proceed-work`.

Every work cycle MUST produce a git commit. No silent work.

---

## Architecture

```
TechEx/
├── console/                # Main application — gem2-techex
│   ├── main.go             # Entry point
│   ├── orchestrator.go     # Multi-agent workflow orchestration
│   ├── executor.go         # LLM execution engine
│   ├── gem2client.go       # GEM² truth-filter API client
│   ├── lobstertrap.go      # Veea Lobster Trap integration
│   ├── gate_handlers.go    # Governance gate HTTP handlers
│   ├── compliance.go       # Compliance checks
│   ├── contracts.go        # TPMN contract definitions
│   ├── loan_contracts.go   # Loan approval domain contracts
│   ├── scenarios.go        # Demo scenarios
│   ├── skill_loader.go     # Skill loading from .gem-squared/
│   ├── state.go            # State management
│   └── static/             # Web UI static assets
├── policies/               # Enterprise policy YAML
│   └── gem2_enterprise.yaml
├── Docs/                   # Documentation + workflow candidates
├── bin/                    # Pre-built binaries
├── Dockerfile              # Fly.io deployment
└── fly.toml                # Fly.io config
```

### External APIs

- **gem2-tpmn-checker** (`POST https://gem2-tpmn-checker.fly.dev/api/v1/truth-filter`) — epistemic audit
- **Veea Lobster Trap** — prompt inspection + policy enforcement
- **LLM APIs** (Gemini, Claude, OpenAI) — agent content generation

---

## Project Context

```
.gem-squared/alarm.md              # Session state + counters
.gem-squared/work-plan/            # Active WPs (WP-AO-01 through WP-AO-04, WP-ST-4)
.gem-squared/archive/              # Completed WPs
.gem-squared/verify-work-logs/     # Verification logs
.gem-squared/evidences/            # Evidence artifacts
.gem-squared/truth-logs/           # Truth-filter audit logs
```

---

## Core Invariants

- L0 mode (git + .gem-squared/ files) — no gem2-studio MCP
- Every work cycle produces a git commit
- LLM-agnostic: same governance gate works across Gemini, Claude, OpenAI
- GEM² truth-filter is external API (proprietary SaaS, not in this repo)
- Lobster Trap integration for input-side policy enforcement

---

*CLAUDE.md v2.0.0 | AI Agent Olympics | GEM².AI*
