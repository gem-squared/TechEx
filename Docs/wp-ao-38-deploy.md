# WP-AO-38 — Production Deploy Instructions

**Status:** Linux binary cross-compiled and ready. VPS deploy + production verify steps below — execute manually since the session running WP-AO-38 does not have SSH access to the VPS.

**Linux binary:** `bin/gem2-crafter-linux` (12,135,699 bytes, statically linked, x86-64 ELF).

---

## 1. Pre-flight (run locally before scp)

```bash
# Verify the binary is the one we just built
ls -la bin/gem2-crafter-linux
file bin/gem2-crafter-linux        # expect: ELF 64-bit LSB executable, x86-64, statically linked
sha256sum bin/gem2-crafter-linux   # record this; production should match after scp
```

---

## 2. Deploy (follow WP-AO-23 / WP-AO-25 backup-ladder convention)

```bash
# 1. scp binary as .new — does NOT replace live binary yet
scp bin/gem2-crafter-linux root@173.199.92.236:/opt/gem2-crafter/gem2-crafter.new

# 2. Rotate backup ladder (preserves 5 generations of prior binaries)
ssh root@173.199.92.236 '
  cd /opt/gem2-crafter
  [ -f gem2-crafter.prev4 ] && mv gem2-crafter.prev4 gem2-crafter.prev5
  [ -f gem2-crafter.prev3 ] && mv gem2-crafter.prev3 gem2-crafter.prev4
  [ -f gem2-crafter.prev2 ] && mv gem2-crafter.prev2 gem2-crafter.prev3
  [ -f gem2-crafter.prev  ] && mv gem2-crafter.prev  gem2-crafter.prev2
  mv gem2-crafter gem2-crafter.prev
  mv gem2-crafter.new gem2-crafter
  chmod +x gem2-crafter
'

# 3. Restart the service (systemd unit unchanged from prior deploys —
#    AUTH_KEYS, GEMINI_API_KEY, GEM2_API_KEY, VULTR_INFERENCE_API_KEY
#    are already configured)
ssh root@173.199.92.236 'systemctl restart gem2-crafter'

# 4. Verify the service is active and the banner shows auth on
ssh root@173.199.92.236 'systemctl is-active gem2-crafter && journalctl -u gem2-crafter -n 5 --no-pager'
# expect: active
# expect: "GEM² Console listening on :8080 (auth: 1 keys)"
```

---

## 3. Production verify (after deploy)

```bash
# Replace <PROD_KEY> with a real key from AUTH_KEYS on the VPS
PROD="https://ai-olympic.gemsquared.ai"
KEY="<PROD_KEY>"

# Canvas page
curl -s -o /dev/null -w "GET /workflow-canvas.html: HTTP %{http_code}\n" "$PROD/workflow-canvas.html"
# expect: 200

# Static assets
for f in style.css vendor/drawflow/drawflow.min.css vendor/drawflow/drawflow.min.js workflow-canvas.css workflow-canvas.js; do
  curl -s -o /dev/null -w "  /$f → HTTP %{http_code}\n" "$PROD/$f"
done
# all expect: 200

# Auth integrity (workflow routes)
curl -s -o /dev/null -w "GET /api/workflow/list (no key): HTTP %{http_code}\n" "$PROD/api/workflow/list"
# expect: 401
curl -s "$PROD/api/workflow/list" -H "X-Access-Key: $KEY" | head -c 200
# expect: {"workflows":[...]} (or {"workflows":[]} if none saved yet)

# Regression on existing endpoints
curl -s -o /dev/null -w "GET /api/providers no-key: HTTP %{http_code}\n" "$PROD/api/providers"
# expect: 401
curl -s -o /dev/null -w "GET /api/providers auth:   HTTP %{http_code}\n" "$PROD/api/providers" -H "X-Access-Key: $KEY"
# expect: 200
curl -s -o /dev/null -w "GET /:                    HTTP %{http_code}\n" "$PROD/"
# expect: 200
curl -s -o /dev/null -w "GET /ce-viewer:           HTTP %{http_code}\n" "$PROD/ce-viewer"
# expect: 200

# Live test (requires at least 1 CE registered on the VPS)
# 1. Open https://ai-olympic.gemsquared.ai/workflow-canvas.html?key=<PROD_KEY>
# 2. Drag a CE card from the palette onto the canvas
# 3. Click Save → toast "Saved <slug>"
# 4. Click Run → trace panel opens, SSE events appear, banner shows SUCCESS or halt
# 5. Verify .gem-squared/truth-logs/<run_id>.jsonl exists on the VPS
```

---

## 4. Rollback (if anything is wrong)

```bash
ssh root@173.199.92.236 '
  cd /opt/gem2-crafter
  mv gem2-crafter gem2-crafter.broken
  mv gem2-crafter.prev gem2-crafter
  systemctl restart gem2-crafter
  systemctl is-active gem2-crafter
'
```

The backup ladder preserves `.prev2..prev5` so multiple-generation rollback is possible.

---

## 5. What was tested locally (Unit 7 (a))

- ✓ Canvas page loads at `/workflow-canvas.html` (HTTP 200, 4073 bytes), all 6 expected markers present.
- ✓ All 5 static assets reachable (style.css, drawflow.css, drawflow.js, workflow-canvas.css, workflow-canvas.js).
- ✓ Auth integrity: `X-Access-Key` valid → 200; missing → 401.
- ✓ Save → List → Load round-trip persists workflow.json correctly on disk under `.gem-squared/workflows/{slug}.json`, schema_version set to "1.0" automatically.
- ✓ `/api/workflow/ce-contract` returns 404 for missing CE, 400 for invalid slug format.
- ✓ Regression on existing endpoints clean: `/api/providers`, `/`, `/ce-viewer` all 200.

## 6. What requires live VPS deploy (Unit 7 (b) + (c))

- Real CE registry → palette population.
- Real workflow Run with L1+CE+L2 chain firing.
- Truth-log JSONL written on the VPS filesystem.
- Final-verdict banner display.
- SSE stream end-to-end across the Caddy reverse proxy (verify `X-Accel-Buffering: no` is honored).

These are deferred to the developer/operator with SSH access; the deploy procedure above is verbatim from WP-AO-23 / WP-AO-25's proven pattern.
