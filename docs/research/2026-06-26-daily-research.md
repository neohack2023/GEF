# Daily Research Note - 2026-06-26

Status: candidate / working note for developer and LLM review.

## Repo context read
- Repo direction centers on Generated Effects Foundry workflows, validation, local SLM assistance, and review-gated promotion.
- Recent commits show active local SLM inventory work and docs/test stabilization.

## Why this matters
GEF is now close to needing a reliable local-model capability matrix: what each installed SLM is allowed to do, when to escalate, and how a validator proves generated effects are safe enough for review.

## Useful findings
- GitHub Actions secure-use guidance recommends least-privilege workflow tokens, avoiding unsafe privileged triggers, and pinning third-party actions: https://docs.github.com/en/actions/reference/security/secure-use
- MCP security research warns that tool descriptors and hidden metadata can manipulate agent behavior, so local SLM/tool routing should expose capabilities clearly: https://arxiv.org/abs/2512.06556
- Vite remains a lightweight modern app baseline for browser prototypes: https://vite.dev/guide/

## Candidate implementation ideas
1. Add `docs/local-slm/CAPABILITY_MATRIX.md` with model, task type, input limits, allowed outputs, and escalation rule.
2. Add a generated-effect receipt field: model used, validator status, human-review status, and rejected reasons.
3. Add CI that fails if generated modules lack a promotion receipt.
4. Add a “local SLM advisory only” banner for risky tasks such as file writes, tool calls, or external fetches.

## Risks / drift warnings
- Do not let local SLM output bypass validators.
- Do not let model inventory UI become a hidden policy engine.
- Keep promotion PR-first and source-backed.

## Next suggested dev / LLM actions
- Draft the capability matrix from current installed-model docs.
- Add one fixture for a rejected generated visual module.
- Add validator docs that explain what the LLM must not infer.
