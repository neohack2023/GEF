# Daily Research Note - 2026-06-24

Status: candidate/working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- Prior repo context identifies GEF as a generated/evolving visual framework with validator and promotion concerns.
- Recent research PRs point toward CI self-repair packets and generated visual module validation.

## Why this matters
GEF should let generators propose rich visuals while CI and receipts decide whether a module is safe enough to promote.

## Useful findings
- GitHub Actions secure-use guidance recommends minimum required workflow permissions and caution around untrusted generated content: https://docs.github.com/en/actions/reference/security/secure-use
- MCP security guidance emphasizes explicit tool boundaries, consent, and avoiding tool/data poisoning: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- MDN WebGPU docs reinforce feature detection and fallback thinking for advanced GPU features: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Candidate implementation ideas
1. Define a generated-module receipt with prompt hash, generator, accepted APIs, denied APIs, screenshot/demo path, and validator outcome.
2. Add a validator fixture that intentionally fails forbidden APIs or unsafe external fetches.
3. Add a fallback contract for visual modules: WebGL/canvas baseline before WebGPU-only effects.
4. Add CI artifact naming that lets LLMs compare failed vs repaired outputs.

## Risks / drift warnings
- Do not let visual generation skip human review.
- Do not promote modules that only work on one browser/device path.
- Keep repair agents from writing directly to canon.

## Next suggested dev / LLM actions
- Draft the module receipt schema.
- Add one failing fixture and one passing fixture.
- Update validator docs with candidate/promotion status language.
