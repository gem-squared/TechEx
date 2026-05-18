#!/usr/bin/env bash
# aio-demo-bootstrap.sh
#
# One-shot script that makes the production VPS demo-ready for the
# 6-CE Health-Insurance-Claim pipeline. Idempotent — re-runs replace
# the existing registry/workflow state cleanly.
#
# Prerequisites:
#   * SSH access to the VPS via $SSH_KEY (default: ~/.ssh/id_ed25519_aio_deploy)
#   * The production AUTH_KEYS value in $PROD_KEY
#   * Working `go test` toolchain (uses a build-tagged stub-gen helper)
#   * curl + base64 + jq
#
# Usage:
#   PROD_KEY='<the auth key>' ./Docs/aio-demo-bootstrap.sh

set -euo pipefail

PROD_HOST="${PROD_HOST:-root@173.199.92.236}"
PROD_URL="${PROD_URL:-https://ai-olympic.gemsquared.ai}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_aio_deploy}"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
HEALTH_CLAIM_DIR="$PROJECT_ROOT/Docs/Workflow-candidates/health-insurance-claim"
SYN_DIR="$HEALTH_CLAIM_DIR/synthetic data"
WF_JSON_PATH="$PROJECT_ROOT/Docs/claims-demo.workflow.json"

if [ -z "${PROD_KEY:-}" ]; then
  echo "ERROR: PROD_KEY env var must be set (the production AUTH_KEYS value)" >&2
  exit 1
fi
if [ ! -d "$HEALTH_CLAIM_DIR" ]; then
  echo "ERROR: contracts dir not found: $HEALTH_CLAIM_DIR" >&2
  exit 1
fi
if [ ! -d "$SYN_DIR" ]; then
  echo "ERROR: synthetic data dir not found: $SYN_DIR" >&2
  exit 1
fi

CES=(claim-intake policy-verification eligibility-check medical-review claim-adjudication disbursement)
SLUG_PREFIX="health-insurance-claim-pipeline"

STAGE_DIR="$(mktemp -d -t aio-demo-stubs.XXXXXX)"
trap 'rm -rf "$STAGE_DIR"' EXIT

echo "──────────────────────────────────────────────────────────────"
echo "1. Generating 6 CESpec stubs from $HEALTH_CLAIM_DIR/"
echo "──────────────────────────────────────────────────────────────"
cd "$PROJECT_ROOT"
HEALTH_CLAIM_DIR="$HEALTH_CLAIM_DIR" \
HEALTH_CLAIM_OUT="$STAGE_DIR" \
  go test -tags demobootstrap -run TestGenHealthClaimStubs -v ./console/ 2>&1 \
  | grep -E "^(✓|---|PASS|FAIL)" || true
ls -la "$STAGE_DIR/" | head -10
echo ""

REMOTE_REG="/opt/gem2-crafter/.gem-squared/ce-registry/$SLUG_PREFIX"
echo "──────────────────────────────────────────────────────────────"
echo "2. scp stubs → $PROD_HOST:$REMOTE_REG/"
echo "──────────────────────────────────────────────────────────────"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "$PROD_HOST" "mkdir -p $REMOTE_REG"
scp -i "$SSH_KEY" -o IdentitiesOnly=yes "$STAGE_DIR"/*.json "$PROD_HOST":"$REMOTE_REG"/ > /dev/null
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "$PROD_HOST" "ls -la $REMOTE_REG | head -10"
echo ""

echo "──────────────────────────────────────────────────────────────"
echo "3. Encoding synthetic data files (base64) for /data-synthesize"
echo "──────────────────────────────────────────────────────────────"
FILES_JSON="$STAGE_DIR/files.json"
{
  echo "["
  first=1
  for f in "$SYN_DIR"/*.json; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    b64=$(base64 < "$f" | tr -d '\n')
    if [ "$first" -eq 1 ]; then first=0; else echo ","; fi
    printf '  {"filename":"%s","content_base64":"%s"}' "$name" "$b64"
  done
  echo ""
  echo "]"
} > "$FILES_JSON"
FILE_COUNT=$(jq 'length' "$FILES_JSON")
echo "  encoded $FILE_COUNT files into $FILES_JSON"
echo ""

echo "──────────────────────────────────────────────────────────────"
echo "4. POST /api/data-synthesize/upload × ${#CES[@]} (with --force)"
echo "──────────────────────────────────────────────────────────────"
for stage in "${CES[@]}"; do
  ce_slug="$SLUG_PREFIX/$stage"
  body="$STAGE_DIR/upload-$stage.json"
  jq --arg slug "$ce_slug" --slurpfile files "$FILES_JSON" \
    '{ce_slug: $slug, files: $files[0], force: true}' \
    <<< '{}' > "$body"

  echo -n "  $stage … "
  resp=$(curl -sS -X POST "$PROD_URL/api/data-synthesize/upload" \
    -H "Content-Type: application/json" \
    -H "X-Access-Key: $PROD_KEY" \
    --data-binary "@$body")
  echo "$resp" | jq -r '"sample_i=\(.sample_i_bytes // 0)B tables=\(.tables_count // 0) [\(.table_names // [] | join(","))]"' \
    || echo "(error: $resp)"
done
echo ""

if [ -f "$WF_JSON_PATH" ]; then
  echo "──────────────────────────────────────────────────────────────"
  echo "5. POST /api/workflow/save (claims-demo)"
  echo "──────────────────────────────────────────────────────────────"
  jq --slurpfile wf "$WF_JSON_PATH" \
    '{slug: "claims-demo", workflow: $wf[0]}' \
    <<< '{}' > "$STAGE_DIR/save.json"
  curl -sS -X POST "$PROD_URL/api/workflow/save" \
    -H "Content-Type: application/json" \
    -H "X-Access-Key: $PROD_KEY" \
    --data-binary "@$STAGE_DIR/save.json"
  echo ""
else
  echo "(skipping workflow save — $WF_JSON_PATH not found; Unit 2 of WP-AO-41 ships it)"
fi
echo ""

echo "──────────────────────────────────────────────────────────────"
echo "6. Verify: /api/crafter/ce-registry"
echo "──────────────────────────────────────────────────────────────"
curl -sS "$PROD_URL/api/crafter/ce-registry" -H "X-Access-Key: $PROD_KEY" \
  | jq -r '"  count=\(.count) slugs=[\(.ces | map("\(.workflow_slug)/\(.stage_slug)") | sort | join(", "))]"'
echo ""
echo "──────────────────────────────────────────────────────────────"
echo "BOOTSTRAP COMPLETE"
echo "──────────────────────────────────────────────────────────────"
echo ""
echo "Open the demo:"
echo "  $PROD_URL/  (enter \$PROD_KEY at the gate, click Workflow Canvas)"
