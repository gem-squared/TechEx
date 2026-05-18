# vendor-intake

**Workflow:** Procurement & Vendor Onboarding  
**Domain:** Operations  
**Contract:** `vendor-intake: A → B | P`

---

## A: Input

```yaml
vendor_name:        string    # legal business name
tax_id:             string    # EIN, VAT, or equivalent
country:            string    # ISO 3166-1 alpha-2
business_type:      enum      # {corporation, llc, partnership, sole_proprietor, nonprofit}
certifications:     object[]
  - cert_type:      string    # e.g., "ISO 27001", "SOC 2 Type II", "GDPR DPA"
    issuer:         string
    valid_until:    date
    document_url:   string?
financial_stmt:     object
  annual_revenue:   number    # last fiscal year (USD)
  net_income:       number
  fiscal_year_end:  date
  audited:          bool      # externally audited?
references:         object[]  # 2-3 business references
  - company_name:   string
    contact_name:   string
    contact_email:  string
    relationship:   string    # e.g., "supplier since 2023"
insurance:          object?
  general_liability: number   # coverage amount
  professional_liability: number?
  cyber_liability:  number?
  policy_expiry:    date
```

## F: Processing Logic

1. **Required field validation** — Check all mandatory fields are present and non-empty:
   - `vendor_name`, `tax_id`, `country`, `business_type` — always required
   - `financial_stmt` — required for contracts > $50K
   - `references` — minimum 2 required
   - `insurance` — required for on-site vendors
2. **Tax ID format verification** — Validate format by `country`:
   - US: EIN = XX-XXXXXXX (9 digits)
   - EU: VAT = country_code + up to 12 digits
   - Flag invalid format, do not reject (may need manual review)
3. **Certification validity** — For each certification:
   - Check `valid_until > today()` (not expired)
   - Flag expiring within 90 days as warning
   - Check `document_url` is accessible (or flag as missing)
4. **Sanctions screening** — Check `vendor_name` and `tax_id` against:
   - OFAC SDN list (US)
   - EU consolidated sanctions list
   - Flag matches for compliance team review
5. **Duplicate detection** — Check if `tax_id` already exists in vendor database.
   - Exact match → flag as duplicate, link to existing vendor_id
   - No match → proceed with new vendor creation
6. **Missing documents list** — Compile list of any required but missing items.
7. **Intake verdict** — `intake_complete = all_required_present ∧ no_sanctions_match ∧ no_expired_certs`

## B: Output

```yaml
vendor_id:          string    # newly assigned or existing if duplicate
vendor_name:        string    # normalized legal name
verified:           bool      # all basic validations passed
tax_id_valid:       bool      # format validated
sanctions_clear:    bool      # no sanctions list matches
sanctions_flags:    string[]  # match details if found
duplicate_of:       string?   # existing vendor_id if duplicate detected
missing_docs:       string[]  # list of missing required documents
cert_warnings:      object[]  # expiring certifications
  - cert_type:      string
    valid_until:    date
    days_remaining: number
intake_complete:    bool      # ready to proceed to risk scoring
intake_timestamp:   datetime
```

## P: Postcondition Checklist

- [ ] `vendor_id` is non-empty string
- [ ] `vendor_name` in B matches A (normalized but same entity)
- [ ] `verified` is boolean
- [ ] `intake_complete = true` ⟹ `verified = true ∧ sanctions_clear = true ∧ len(missing_docs) = 0`
- [ ] `intake_complete = false` ⟹ `len(missing_docs) > 0` OR `sanctions_clear = false`
- [ ] `tax_id_valid` reflects format check for `country` in A
- [ ] `sanctions_clear = false` ⟹ `sanctions_flags` is non-empty
- [ ] `sanctions_clear = true` ⟹ `sanctions_flags` is empty
- [ ] If duplicate detected → `duplicate_of` is non-null with valid vendor_id
- [ ] Each `cert_warnings` entry has `valid_until` within 90 days of today
- [ ] `missing_docs` only lists items that are required based on contract size and vendor type
- [ ] `intake_timestamp` is valid ISO 8601, not future-dated
- [ ] No PII exposure: `references[].contact_email` not leaked into output fields beyond intake record
