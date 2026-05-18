# `workflow.json` Specification

**Version:** 1.0 (draft, 2026-05-17)
**Status:** Source-of-truth for both the GEM²-Crafter workflow canvas (Stage 3) and any backend runner (`POST /api/workflow/run`).
**Owner:** Stage-3 lane (this session) + Stage-2 lane (other session) — coordination point.

---

## 1. Purpose

`workflow.json` is the **serialized form of a DAG of Contract-Executors (CEs)** authored either by a drag-and-drop canvas (Drawflow today, future canvas tomorrow) or hand-written by a power user. The runner executes the DAG node-by-node, calling each CE's microservice (`POST /ce/{wf}/{stage}/`) and bracketing every node with L1 P-check (input) and L2 O-check (output) per the GEM² governance gate model.

The file is **the only artifact that both the canvas and the runner read**. Two sessions, one schema, zero ambiguity.

---

## 2. Top-Level Shape

```json
{
  "schema_version": "1.0",
  "workflow_slug": "claims-end-to-end",
  "title": "Health Insurance Claim — end-to-end pipeline",
  "created_at": "2026-05-17T18:40:00+09:00",
  "entry_node": "n1",
  "exit_node": "n3",
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

Fields (all required unless marked optional):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | ✓ | Semver. Bumps follow §8 policy. |
| `workflow_slug` | string (kebab-case) | ✓ | Stable identifier used for the run endpoint and audit logs. |
| `title` | string | ✓ | Human-readable name shown in canvas + UI. |
| `created_at` | ISO 8601 | ✓ | Authoring timestamp. |
| `entry_node` | node id | ✓ | First node to fire. Must be in `nodes`. |
| `exit_node` | node id | ✓ | Last node whose output is the final workflow output. v1: must be in `nodes`. |
| `nodes` | array | ✓ | DAG vertices. See §3. |
| `edges` | array | ✓ | DAG edges. See §4. |
| `description` | string | optional | Long-form narrative. |
| `audit_l1` | bool | optional (WP-AO-50; defaults to true when absent) | When `false`, the runner SKIPS the L1 P-check SaaS call before each CE invocation and emits a synthetic `phase: "l1", verdict: "SKIPPED"` event in its place. Useful for demos that don't depend on the audit-gate SaaS. |
| `audit_l2` | bool | optional (WP-AO-50; defaults to true when absent) | Same SKIP semantics for the L2 O-check after each CE invocation. |

---

## 3. Node Shape

```json
{
  "id": "n1",
  "ce_slug": "insurance-claims-workflow/claim-intake",
  "position": { "x": 100, "y": 200 },
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string `n<int>` | ✓ | Stable within this workflow. Format: `n` + positive integer (e.g. `n1`, `n23`). Auto-assigned by the canvas; never reused on delete. |
| `ce_slug` | string (`{workflow}/{stage}`) | ✓ | CE registry key. Resolves via `GET /api/crafter/ce-registry` then `.gem-squared/ce-registry/{wf}/{stage}.json`. |
| `position` | `{x: int, y: int}` | ✓ | Canvas pixel position. Pure UX data; runner ignores it. |
| `config` | object | optional | Per-node runtime config: model override, retry policy, timeout. v1: empty object permitted. |

### ID strategy (decisive)

- Format: `n<int>`, monotonically increasing within a workflow.
- The canvas (Drawflow today) emits integer IDs (`1`, `2`, ...) — we prefix `"n"` on serialization.
- IDs are **stable across save/load** and are **never recycled** when a node is deleted. Holes in the integer sequence are valid (e.g. `n1, n2, n4, n5` after deleting node 3).
- Workflow runs reference node ids in audit logs — stability matters for replay.

---

## 4. Edge Shape

```json
{
  "from": "n1.output",
  "to": "n2.input",
  "expected_schema_hash": "sha256:abc123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `"<node_id>.output"` or `"<node_id>.output_<k>"` | ✓ | Source port. Single-output CEs use `.output`; multi-output uses `.output_<k>` (k=1..N). |
| `to` | `"<node_id>.input"` or `"<node_id>.input_<k>"` | ✓ | Destination port. Symmetric to `from`. |
| `expected_schema_hash` | string `"sha256:<hex>"` | optional in v1 | SHA-256 of the source CE's B schema at edge-creation time. Used to detect "CE was rebuilt with a new schema" and surface a broken-edge warning. v1: optional, v2: required. |

### Edge invariants

- ⊢ No edge may connect a node to itself (no self-loops in v1).
- ⊢ No two edges may share the same `(to)` — single-input ports only in v1.
- ⊢ DAG must be acyclic. v1 validates via a topological sort at load time.
- ⊢ Every `from`/`to` must reference an existing node id.

---

## 5. Worked Example — 3-CE Linear Health Claim

```json
{
  "schema_version": "1.0",
  "workflow_slug": "claims-end-to-end",
  "title": "Health Insurance Claim — end-to-end pipeline",
  "created_at": "2026-05-17T18:40:00+09:00",
  "entry_node": "n1",
  "exit_node": "n3",
  "description": "Three CEs in series: intake validation → eligibility check → payout calculation.",
  "nodes": [
    {
      "id": "n1",
      "ce_slug": "insurance-claims-workflow/claim-intake",
      "position": { "x": 80, "y": 200 }
    },
    {
      "id": "n2",
      "ce_slug": "insurance-claims-workflow/eligibility-check",
      "position": { "x": 360, "y": 200 }
    },
    {
      "id": "n3",
      "ce_slug": "insurance-claims-workflow/payout-calculation",
      "position": { "x": 640, "y": 200 }
    }
  ],
  "edges": [
    { "from": "n1.output", "to": "n2.input" },
    { "from": "n2.output", "to": "n3.input" }
  ]
}
```

Runner behavior for this example:

1. Receive POST `/api/workflow/run` with body `{ "workflow": <above>, "input": {...} }`.
2. Topological order: `n1 → n2 → n3`.
3. For each node `n_i`:
   - **L1 P-check:** `POST https://gem2-tpmn-checker.fly.dev/api/v1/p-check { contract: ce_i.contract, input: payload_i }`. Verdict `ALLOW | DENY`. `DENY` halts.
   - **CE call:** `POST /ce/{wf}/{stage}/ { ...payload_i }`. Returns `payload_{i+1}`.
   - **L2 O-check:** `POST .../o-check { contract: ce_i.contract, output: payload_{i+1} }`. Verdict `SUCCESS | FAILURE`. `FAILURE` halts before forwarding.
4. Persist full trace to `.gem-squared/truth-logs/{run_id}.jsonl` for replay.

---

## 6. CE Registry — Reference

The CE registry is **owned and authoritative on Stage-2 lane**. This spec **references** it; it does NOT redefine it.

- Source on disk: `.gem-squared/ce-registry/{workflow_slug}/{stage_slug}.json` (created by `/create-ce`).
- HTTP enumeration: `GET /api/crafter/ce-registry` returns `[{ workflow, stage, model, contract, ... }]`.
- Schema of each entry is defined by the Stage-2 code in `console/ce_registry.go` — **do not duplicate here**.

Stage-3 reads the registry to populate the canvas palette and to resolve `ce_slug` → contract during runs. Stage-3 **never writes** to the registry.

---

## 7. Drawflow ↔ Canonical Mapping (Shim Spec)

Drawflow's `editor.export()` emits a JSON shape that is similar to but not identical to `workflow.json`. The shim translates both ways.

### Drawflow's native format

```json
{
  "drawflow": {
    "Home": {
      "data": {
        "1": {
          "id": 1,
          "name": "ce-card",
          "data": { "ce_slug": "insurance-claims-workflow/claim-intake" },
          "class": "ce-card",
          "html": "...",
          "typenode": false,
          "inputs": {},
          "outputs": {
            "output_1": {
              "connections": [ { "node": "2", "output": "input_1" } ]
            }
          },
          "pos_x": 80,
          "pos_y": 200
        },
        "2": { /* ... */ }
      }
    }
  }
}
```

Key differences:

| Concept | Drawflow native | `workflow.json` canonical |
|---------|-----------------|---------------------------|
| Node id | integer `1`, `2` | string `"n1"`, `"n2"` |
| CE reference | `data.ce_slug` | `ce_slug` (top-level node field) |
| Position | `pos_x`, `pos_y` | `position: { x, y }` |
| Port name (source) | `output_1` | `"output"` (or `"output_1"` if multi-output) |
| Port name (dest) | `input_1` | `"input"` (or `"input_1"` if multi-input) |
| Edge format | nested in `outputs.<port>.connections[]` | flat `edges[]` array with `from`/`to` strings |
| Entry/exit nodes | not represented | explicit `entry_node` / `exit_node` |

### Translation rules (canvas → canonical)

```
canvas.nodes[i].id      ↦  "n" + i
canvas.nodes[i].pos_x   ↦  position.x
canvas.nodes[i].pos_y   ↦  position.y
canvas.nodes[i].data.ce_slug  ↦  ce_slug

canvas.outputs[src].connections[].(node, output)
  ↦  edges[].from = "n" + src + "." + (output==="output_1" ? "output" : "output_"+k_from_index)
  ↦  edges[].to   = "n" + node + "." + (input==="input_1" ? "input" : "input_"+k)

entry_node  ↦  node with zero incoming edges (must be exactly 1 in v1)
exit_node   ↦  node with zero outgoing edges (must be exactly 1 in v1)
```

### Translation rules (canonical → canvas)

```
"n3"                     ↦  3   (strip the "n" prefix; integer id)
position.x / position.y  ↦  pos_x / pos_y
ce_slug                  ↦  data.ce_slug
"n1.output"              ↦  outputs.output_1.connections[].node = "1"
"n2.input"               ↦  ...connections[].output = "input_1"
```

The shim lives in `console/workflow_yaml.go` (Phase 2; per WP-AO-37 ¬B, NOT in this WP). It is unit-tested with the §5 worked example as the golden fixture.

---

## 8. Versioning Policy

- `schema_version` is bumped on **breaking** changes only (field rename, removal, semantics change).
- Additive changes (new optional fields) leave `schema_version` unchanged but documented in a `## Changelog` section at the bottom of this spec.
- Runners MUST refuse to execute a workflow whose `schema_version` they don't recognize.
- The canvas MAY surface a "this workflow uses schema vX.Y; please update" message and refuse to load.

---

## 9. Open Questions (deferred to v2)

| # | Question | Default for v1 |
|---|----------|----------------|
| Q1 | Fan-out / fan-in (one node with N outputs, multiple incoming edges per node) | Linear chains only. Exactly one entry, one exit, no branching. |
| Q2 | `expected_schema_hash` enforcement | Optional in v1, becomes required in v2 once CE versioning ships. |
| Q3 | JSON Schema for runtime validation | Prose + worked example only in v1. v2 may add a `workflow.schema.json`. |
| Q4 | Multi-workflow projects (one `project_slug` owning many workflows) | One workflow per project file in v1. |
| Q5 | Per-edge transformations (map A.field → B.field) | None in v1 — CE's input must match the predecessor's output 1:1. |
| Q6 | Conditional edges (`if x > 0 go here else go there`) | Not supported in v1. Future: separate `conditions` array referencing edge ids. |
| Q7 | Per-node retry policy and L1/L2 trust-gate thresholds | Defaults in v1 — defined in the CE's own contract, not at workflow level. v2 may override per-node. |

---

## 10. Validation Rules (v1)

A `workflow.json` is **valid** iff all of:

- `schema_version == "1.0"`.
- All required top-level fields present.
- `entry_node` ∈ node ids; `exit_node` ∈ node ids.
- All `ce_slug` values resolve via `GET /api/crafter/ce-registry`.
- All `edges[].from` and `edges[].to` reference existing node ids and valid port names.
- DAG is acyclic (topological sort succeeds).
- v1: exactly one entry, exactly one exit, no fan-out (every node has ≤1 outgoing edge), no fan-in (every node has ≤1 incoming edge).
- v1: no self-loops.

Validation MUST happen at three points:
1. **In the canvas** when saving (block save on invalid).
2. **In the runner** at `POST /api/workflow/run` start (return 400 with the failed predicate).
3. **In the audit-log replayer** on load (refuse replay if the workflow snapshot is invalid).

---

## 11. Out of Scope (this spec)

- The Drawflow library itself (vendored separately, see WP-AO-37 Unit 1).
- The runner backend code (Phase 2 / production WP).
- The audit-log JSONL schema (lives in WP-AO-25 / future Stage-4 work).
- CE generation, contract authoring, sample-input generation — all Stage-2 / `console/ce_*.go`.

---

## Changelog

- **2026-05-17 — v1.0.** Initial spec. Linear chains only. Drawflow-native shim included. Cross-session source of truth between Stage-2 lane (CE registry owner) and Stage-3 lane (canvas + runner).

*— Authored as WP-AO-37 Unit 2, GEM².AI*
