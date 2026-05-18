package main

// WP-01 U3 — L3 egress inspection (port from demo-advanced/console/workflow_gates.go:313-957).
//
// L3 is the egress mirror of L0. JSON output → mask PII → render to ≤300-char
// NL summary (Gemini or Vultr via ltRenderJSONasNL) → regex pre-scan → Lobster
// Trap on rendered NL + raw JSON. Catches what L1/L2 schema audits don't:
// unmasked PII in user-facing fields, credential leak, wire-fraud language,
// upstream prompt-injection bleed.
//
// Fail-open: any LLM error → fall back to deterministic JSON-flatten + regex.

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"strings"
)

// ── l3Pattern + 14 egress patterns (verbatim from demo-advanced) ────

type l3Pattern struct {
	re   *regexp.Regexp
	rule string
}

var l3EgressPatterns = []l3Pattern{
	// Wire-fraud / fraudulent transfer instructions in disbursement output.
	{regexp.MustCompile(`(?i)\b(send|transfer|wire|disburse)\b.{0,80}\$\d`), "block_wire_fraud"},
	{regexp.MustCompile(`(?i)\b(offshore|untraceable|anonymous|shell\s+(company|account)|beneficiary)\b.{0,40}\b(account|routing|holding|recipient)\b`), "block_wire_fraud"},
	{regexp.MustCompile(`(?i)\b(routing|aba)\s*(number|#)?\s*:?\s*\d{9}\b.{0,80}\b(account|recipient|beneficiary)\b`), "block_wire_fraud"},
	// Credential-leak patterns in egress.
	{regexp.MustCompile(`(?i)\b(api\s*key|token|password|secret|bearer)\s*[:=]?\s*[a-zA-Z0-9_\-]{16,}`), "block_credential_leak"},
	{regexp.MustCompile(`-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PRIVATE)\s+(PRIVATE\s+)?KEY-----`), "block_credential_leak"},
	{regexp.MustCompile(`\beyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\b`), "block_credential_leak"},
	{regexp.MustCompile(`(?i)\b(mysql|postgres|postgresql|mongodb|redis)://[^\s]{8,}`), "block_credential_leak"},
	{regexp.MustCompile(`(?i)\bsk-[a-zA-Z0-9_\-]{16,}\b`), "block_credential_leak"},               // OpenAI / Anthropic
	{regexp.MustCompile(`\b(ghp|gho|ghu|ghr|ghs)_[A-Za-z0-9]{20,}\b`), "block_credential_leak"},   // GitHub PAT
	{regexp.MustCompile(`\bAKIA[0-9A-Z]{16}\b`), "block_credential_leak"},                          // AWS Access Key ID
	{regexp.MustCompile(`(?i)\b(sk|pk)_(live|test)_[a-zA-Z0-9]{16,}\b`), "block_credential_leak"}, // Stripe
	// Exfiltration channel signature.
	{regexp.MustCompile(`(?i)\b(send|leak|exfil|dump|forward|email)\b.{0,40}\b(to|at)\s+[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`), "block_data_exfiltration"},
}

func l3EgressPreScan(nl string) (rule string, matched bool) {
	for _, p := range l3EgressPatterns {
		if p.re.MatchString(nl) {
			return p.rule, true
		}
	}
	return "", false
}

// ── scrubExpectedBankingFields ───────────────────────────────────
// Masks the legitimate disbursement_account container so the L3 credential-leak
// regex doesn't trigger on routing+account numbers that are part of normal
// claim payout output.
func scrubExpectedBankingFields(v interface{}) interface{} {
	m, ok := v.(map[string]interface{})
	if !ok {
		return v
	}
	out := make(map[string]interface{}, len(m))
	for k, vv := range m {
		if k == "disbursement_account" || k == "payment_details" || k == "bank_account_no" {
			out[k] = "<bank routing+account redacted from L3 scan>"
			continue
		}
		if sub, ok := vv.(map[string]interface{}); ok {
			out[k] = scrubExpectedBankingFields(sub)
		} else {
			out[k] = vv
		}
	}
	return out
}

// ── l3DecodeStego ────────────────────────────────────────────────
// Decode base64 / hex tokens so encoded credentials are caught.
var (
	base64TokenRe = regexp.MustCompile(`\b[A-Za-z0-9+/]{16,}={0,2}\b`)
	hexTokenRe    = regexp.MustCompile(`\b[0-9A-Fa-f]{20,}\b`)
)

func l3DecodeStego(s string) string {
	out := s
	for _, m := range base64TokenRe.FindAllString(s, -1) {
		if len(m)%4 != 0 {
			continue
		}
		if d, err := base64.StdEncoding.DecodeString(m); err == nil && isPrintableUTF8(string(d)) {
			out = out + "\n[B64_DECODED] " + string(d)
		}
	}
	for _, m := range hexTokenRe.FindAllString(s, -1) {
		if len(m)%2 != 0 {
			continue
		}
		if d, err := hex.DecodeString(m); err == nil && isPrintableUTF8(string(d)) {
			out = out + "\n[HEX_DECODED] " + string(d)
		}
	}
	return out
}

func isPrintableUTF8(s string) bool {
	for _, r := range s {
		if r == '\n' || r == '\r' || r == '\t' {
			continue
		}
		if r < 0x20 || r > 0x7E {
			if r < 0xA0 {
				return false
			}
		}
	}
	return len(s) > 0
}

// ── jsonToNL — deterministic fallback flattening ─────────────────
func jsonToNL(v interface{}) string {
	var b strings.Builder
	flattenJSON(v, &b)
	return strings.TrimSpace(b.String())
}

func flattenJSON(v interface{}, b *strings.Builder) {
	switch t := v.(type) {
	case string:
		b.WriteString(t)
		b.WriteString(" ")
	case float64:
		b.WriteString(strings.TrimRight(strings.TrimRight(formatFloat(t), "0"), "."))
		b.WriteString(" ")
	case bool:
		if t {
			b.WriteString("true ")
		} else {
			b.WriteString("false ")
		}
	case map[string]interface{}:
		for k, vv := range t {
			b.WriteString(k)
			b.WriteString(": ")
			flattenJSON(vv, b)
		}
	case []interface{}:
		for _, vv := range t {
			flattenJSON(vv, b)
		}
	}
}

func formatFloat(f float64) string {
	if f == float64(int64(f)) {
		return strings.TrimRight(strings.TrimRight(jsonNum(f), "0"), ".")
	}
	return jsonNum(f)
}
func jsonNum(f float64) string {
	bs, _ := json.Marshal(f)
	return string(bs)
}

// ── l3EgressInspect — orchestrator (port of workflow_gates.go:911) ─
// Returns map result with verdict, risk_score, matched_rule, flags, nl_preview,
// rendered_nl, lt_raw.
func l3EgressInspect(finalOutput interface{}, enableLLM bool) map[string]interface{} {
	scrubbed := scrubExpectedBankingFields(finalOutput)
	var renderedNL string
	if enableLLM {
		renderedNL = ltRenderJSONasNL(scrubbed)
	}
	rawJSON, _ := json.Marshal(scrubbed)
	var scanContent string
	if renderedNL != "" {
		scanContent = renderedNL + " " + string(rawJSON)
	} else {
		scanContent = jsonToNL(scrubbed) + " " + string(rawJSON)
	}
	scanContent = l3DecodeStego(scanContent)
	preview := scanContent
	if len(preview) > 300 {
		preview = preview[:300] + "..."
	}
	if egressRule, matched := l3EgressPreScan(scanContent); matched {
		return map[string]interface{}{
			"verdict":      "DENY",
			"risk_score":   0.85,
			"matched_rule": egressRule,
			"flags":        []string{"egress pre-scan"},
			"deny_message": "[L3 EGRESS] Blocked: " + egressRule,
			"nl_preview":   preview,
			"rendered_nl":  renderedNL,
		}
	}
	lt := ltInspectWithLLM(scanContent, enableLLM)
	resp := map[string]interface{}{
		"verdict":      lt.Verdict,
		"risk_score":   lt.RiskScore,
		"matched_rule": lt.MatchedRule,
		"flags":        lt.Flags,
		"deny_message": lt.DenyMessage,
		"nl_preview":   preview,
		"rendered_nl":  renderedNL,
	}
	if lt.Raw != nil {
		resp["lt_raw"] = json.RawMessage(lt.Raw)
	}
	return resp
}
