# Daily Research Note - 2026-06-23

Status: candidate/working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- Repo context points to GEF as a generated-effects framework where visual modules need validation before promotion.
- Prior notes emphasize validator receipts, promotion gates, and avoiding canon drift from generated modules.

## Why this matters
GEF needs a self-repair loop that catches broken generated effects without trusting the generator as judge and jury.

## Useful findings with citations
- GitHub recommends minimum `GITHUB_TOKEN` permissions, safe handling of secrets, and avoiding risky `pull_request_target` patterns with untrusted code. Source: https://docs.github.com/en/actions/reference/security/secure-use
- Vitest Browser Mode runs tests in real browser providers, useful for checking DOM/canvas-facing behavior. Source: https://vitest.dev/guide/browser/

## Implementation ideas
1. Add a validator receipt schema for every generated module.
2. Add fixtures for accepted, rejected, and warning-only visual modules.
3. Add CI that runs syntax, schema, and minimal browser smoke checks before promotion.
4. Add a repair packet format that tells the LLM which validator failed and which files are in scope.

## Risks / drift warnings
- Do not allow generated effects to bypass validation because they “look good.”
- Keep repair prompts narrow; avoid repo-wide rewrites from a single validator failure.
- Separate visual taste notes from objective build/test failures.

## Next suggested dev / LLM actions
- Draft `docs/VALIDATOR_RECEIPTS.md`.
- Add one intentionally bad generated module fixture.
- Add a CI summary artifact that becomes the LLM repair handoff packet.
