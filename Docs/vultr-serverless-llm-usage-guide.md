# Vultr Serverless LLM — Usage Guide

**Source of truth:** working integration in `gem2-crafter` (console/llm_exec.go, ce_handlers.go). All snippets below are extracted from production-tested code.
**Verified:** 2026-05-17 against `https://api.vultrinference.com/v1`
**Status:** OpenAI-compatible chat completions API, Bearer-token auth, response_format=json_object supported.

---

## 1. Setup

### 1.1 Account + API key

1. Create / sign in at [Vultr](https://my.vultr.com/).
2. Navigate to **Serverless Inference → API Keys**.
3. Generate a key. Store it as `VULTR_INFERENCE_API_KEY` in your env / secret manager.

### 1.2 Env vars (canonical)

```bash
export VULTR_INFERENCE_API_KEY="vultr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export VULTR_INFERENCE_URL="https://api.vultrinference.com/v1"   # optional, default same
```

The key is sent as `Authorization: Bearer ${VULTR_INFERENCE_API_KEY}` — same convention as OpenAI.

---

## 2. Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/chat/completions` | POST | Run a chat completion (system + user messages → assistant response) |
| `/v1/models` | GET | List available models with their full namespaced IDs |

Base URL: `https://api.vultrinference.com/v1`

---

## 3. Model catalog (full namespaced IDs)

Vultr's `model` field expects the **publisher-prefixed** ID — NOT just the model name. Wrong prefix = 404. Verified via live `GET /v1/models` 2026-05-16.

| Model ID (use this in `"model"`) | In ($/M tok) | Out ($/M tok) | Notes |
|---|---|---|---|
| `nvidia/Llama-3.1-Nemotron-Safety-Guard-8B-v3` | 0.01 | 0.01 | Safety-classifier; cheapest |
| `nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16` | 0.13 | 0.38 | MoE reasoning, small footprint |
| `moonshotai/Kimi-K2.6` | 0.15 | 0.60 | **Caveat:** observed 404 responses referencing a Nemotron model — looks like a Vultr-side load-balancer routing issue. Retry with a different model on failure. |
| `nvidia/Nemotron-Cascade-2-30B-A3B` | 0.15 | 0.60 | MoE, stable |
| `MiniMaxAI/MiniMax-M2.7` | 0.30 | 1.20 | |
| `Qwen/Qwen3.5-397B-A17B-FP8` | 0.30 | 1.20 | MoE 397B (17B active) |
| `nvidia/DeepSeek-V3.2-NVFP4` | 0.55 | 1.65 | **Recommended default for production workloads** — verified reliable end-to-end (1-2s typical response for ~4 KB prompt). Production-stable in our deploy. |
| `zai-org/GLM-5.1-FP8` | 0.85 | 3.10 | |

Pricing as of 2026-05-17 — confirm against the Vultr dashboard before relying on it. The catalog evolves; always cross-check via `GET /v1/models`.

---

## 4. Chat-completions request shape

```json
POST /v1/chat/completions
Authorization: Bearer ${VULTR_INFERENCE_API_KEY}
Content-Type: application/json

{
  "model": "nvidia/DeepSeek-V3.2-NVFP4",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant. Output JSON only."},
    {"role": "user",   "content": "Compute 2+2 and return {\"sum\": <int>}."}
  ],
  "temperature": 0.1,
  "max_tokens": 8192,
  "response_format": {"type": "json_object"}
}
```

**Field notes:**
- `model` — full namespaced ID from §3.
- `messages` — OpenAI-style array. `system` + `user` minimum. Multi-turn supported.
- `temperature` — we use `0.1` for deterministic contract execution; raise for creative tasks.
- `max_tokens` — we cap at `8192`. Most models accept higher.
- `response_format: {"type": "json_object"}` — forces JSON-only output. Without it, the model may wrap output in markdown code fences. **Highly recommended** for any programmatic flow.

### Response shape

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1735905600,
  "model": "nvidia/DeepSeek-V3.2-NVFP4",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "{\"sum\": 4}"},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 42, "completion_tokens": 8, "total_tokens": 50}
}
```

The content payload is the JSON string the model produced. With `response_format=json_object`, you can `JSON.parse(choices[0].message.content)` directly.

---

## 5. Working examples

### 5.1 curl (sanity test)

```bash
curl -s https://api.vultrinference.com/v1/chat/completions \
  -H "Authorization: Bearer $VULTR_INFERENCE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/DeepSeek-V3.2-NVFP4",
    "messages": [
      {"role": "system", "content": "Reply only with JSON."},
      {"role": "user",   "content": "Echo back {\"ok\": true}."}
    ],
    "temperature": 0.1,
    "max_tokens": 512,
    "response_format": {"type": "json_object"}
  }' | jq '.choices[0].message.content'
```

Expected output: `"{\"ok\": true}"` (a JSON string containing a JSON object).

### 5.2 Go (extracted from console/llm_exec.go)

```go
package vultr

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// VultrCall runs a chat completion against Vultr Serverless Inference.
// Returns the assistant message content (which is typically a JSON string
// when response_format=json_object is set).
func VultrCall(apiKey, model, systemPrompt, userPrompt string) (string, error) {
    endpoint := "https://api.vultrinference.com/v1/chat/completions"

    body := map[string]any{
        "model": model,
        "messages": []map[string]string{
            {"role": "system", "content": systemPrompt},
            {"role": "user",   "content": userPrompt},
        },
        "temperature":     0.1,
        "max_tokens":      8192,
        "response_format": map[string]string{"type": "json_object"},
    }
    data, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", endpoint, bytes.NewReader(data))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+apiKey)

    client := &http.Client{Timeout: 180 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return "", fmt.Errorf("vultr request: %w", err)
    }
    defer resp.Body.Close()

    respBody, _ := io.ReadAll(resp.Body)
    if resp.StatusCode != 200 {
        return "", fmt.Errorf("vultr HTTP %d: %s", resp.StatusCode, string(respBody))
    }

    var parsed struct {
        Choices []struct {
            Message struct {
                Content string `json:"content"`
            } `json:"message"`
        } `json:"choices"`
    }
    if err := json.Unmarshal(respBody, &parsed); err != nil {
        return "", fmt.Errorf("parse response: %w", err)
    }
    if len(parsed.Choices) == 0 {
        return "", fmt.Errorf("vultr: no choices in response")
    }
    return parsed.Choices[0].Message.Content, nil
}
```

### 5.3 Python (requests)

```python
import os, json, requests

def vultr_call(model: str, system_prompt: str, user_prompt: str) -> str:
    """Run a Vultr chat completion. Returns the assistant content string
    (typically JSON when response_format=json_object is set)."""
    resp = requests.post(
        "https://api.vultrinference.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.environ['VULTR_INFERENCE_API_KEY']}",
            "Content-Type":  "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            "temperature":     0.1,
            "max_tokens":      8192,
            "response_format": {"type": "json_object"},
        },
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

# Usage:
content = vultr_call(
    model="nvidia/DeepSeek-V3.2-NVFP4",
    system_prompt="You are a helpful assistant. Output JSON only.",
    user_prompt='Compute 2+2 and return {"sum": <int>}.',
)
print(json.loads(content))   # → {"sum": 4}
```

---

## 6. Error handling & operational notes

| Symptom | Likely cause | Resolution |
|---|---|---|
| `HTTP 401 — invalid_api_key` | Wrong / missing `Authorization: Bearer ...` | Re-check env var; key from Vultr dashboard |
| `HTTP 404 — model not found` | Used short ID instead of namespaced full ID | Check `GET /v1/models`; use full `publisher/model` form |
| `HTTP 404` mentioning a DIFFERENT model | Upstream Vultr load-balancer drift (observed with `moonshotai/Kimi-K2.6`) | Retry on a different model — we fall back to `nvidia/DeepSeek-V3.2-NVFP4` |
| `HTTP 429 — rate limit` | Account quota | Throttle or upgrade quota |
| Response content is markdown-wrapped JSON | `response_format` not set OR model ignored it | Always set `response_format={"type":"json_object"}`; defensively strip ```` ``` ```` fences |
| Latency spikes (5-10s typical for ~4KB prompt) | Cold start / model load | Acceptable for non-interactive flows; for hot paths, prefer smaller models (Nemotron-Cascade-2-30B-A3B) |
| Timeout | Network or model warm-up | We use 180s client timeout. Anything > 30s indicates a problem; investigate |

### Defensive JSON parsing

Even with `response_format=json_object`, some models occasionally emit a leading/trailing newline or stray text. Robust parse:

```go
raw = strings.TrimSpace(raw)
if i := strings.Index(raw, "{"); i > 0 { raw = raw[i:] }
if i := strings.LastIndex(raw, "}"); i > 0 && i < len(raw)-1 { raw = raw[:i+1] }
var out map[string]any
json.Unmarshal([]byte(raw), &out)
```

### Recommended defaults

| Setting | Value | Why |
|---|---|---|
| `temperature` | `0.1` | Deterministic outputs for contract/workflow execution |
| `max_tokens` | `8192` | Covers typical structured outputs; raise for long generation |
| `response_format` | `{"type": "json_object"}` | Forces JSON; eliminates markdown-fence parsing |
| HTTP client timeout | `180s` | Allows cold start; lower (30s) for hot-path flows |
| Retry policy | One retry on transport error or 5xx; switch model on 404 | Vultr LBs occasionally route 404s for specific models |
| Default model | `nvidia/DeepSeek-V3.2-NVFP4` | Verified production-stable; balances cost + quality |

---

## 7. Cost-aware model selection

For workloads that need many invocations, start with the cheapest model that meets quality bar and tier up only on observed failure:

```
Tier 1 (cheapest, classification/safety):  nvidia/Llama-3.1-Nemotron-Safety-Guard-8B-v3   $0.01 / $0.01
Tier 2 (reasoning, mid-cost):              nvidia/Nemotron-Cascade-2-30B-A3B               $0.15 / $0.60
Tier 3 (production default):               nvidia/DeepSeek-V3.2-NVFP4                       $0.55 / $1.65
Tier 4 (high quality):                     zai-org/GLM-5.1-FP8                              $0.85 / $3.10
```

Build a fallback chain in code: cheap → mid → expensive. We do this in `wolfiGenerate` (3-tier: Gemini-2.5-pro → Gemini-2.5-flash → Vultr DeepSeek). Same pattern works inside the Vultr catalog alone.

---

## 8. Verifying the integration in 30 seconds

```bash
# 1. Confirm key works
curl -sS https://api.vultrinference.com/v1/models \
  -H "Authorization: Bearer $VULTR_INFERENCE_API_KEY" | jq '.data | length'
# Expect: a number (catalog size)

# 2. Confirm chat completion works
curl -sS https://api.vultrinference.com/v1/chat/completions \
  -H "Authorization: Bearer $VULTR_INFERENCE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"nvidia/DeepSeek-V3.2-NVFP4",
    "messages":[{"role":"user","content":"Reply with {\"ok\":true}."}],
    "response_format":{"type":"json_object"},
    "max_tokens":64
  }' | jq '.choices[0].message.content'
# Expect: "{\"ok\": true}"
```

If both succeed, the integration is functional. Wire into your application code per §5.

---

## 9. Quick reference

| What | Where |
|---|---|
| Account | https://my.vultr.com/ → Serverless Inference |
| API base | `https://api.vultrinference.com/v1` |
| Auth | `Authorization: Bearer ${VULTR_INFERENCE_API_KEY}` |
| Default model | `nvidia/DeepSeek-V3.2-NVFP4` |
| Schema | OpenAI-compatible (chat.completions) |
| JSON mode | `response_format: {"type": "json_object"}` |
| List models | `GET /v1/models` |
| Pricing | Vultr dashboard (catalog evolves; §3 is a snapshot) |

---

*Compiled from production-validated code in gem2-crafter (console/llm_exec.go, ce_handlers.go, sheep_registry.go) as of 2026-05-17.*
