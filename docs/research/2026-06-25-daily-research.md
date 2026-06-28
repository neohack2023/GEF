# Daily Research Note - 2026-06-25

Status: candidate/working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- Repo metadata describes GEF as an autonomous browser-based generative art IDE with audio reactivity, JS/WGSL/GLSL/Python compiling, AI Autopilot, and a bicameral switch-back self-repair system.
- Recent commits on 2026-06-24 show heavy Local SLM defaults/model-inventory work, including tests and docs updates.
- Prior notes emphasize validator receipts, promotion gates, and keeping generated visual modules reviewable.

## Why this matters
GEF is drifting from pure visual playground into local-agent IDE territory. The next guardrail should make Local SLM calls observable, revocable, and testable before they become part of the creative runtime.

## Useful findings with citations
- GitHub’s secure-use guidance recommends read-only default `GITHUB_TOKEN`, job-level permission increases only when needed, and careful handling of untrusted PR/event text. Source: https://docs.github.com/en/actions/reference/security/secure-use
- 2026 agentic-workflow research describes AWI risks when GitHub event text flows into agent prompts and then scripts/tools. Source: https://arxiv.org/abs/2605.07135
- MCP’s tool/resource/prompt model supports explicit boundaries for local tools and generated context. Source: https://modelcontextprotocol.io/specification/2025-06-18
- MDN’s WebGPU docs recommend capability detection and secure-context gating for browser GPU features. Source: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Candidate implementation ideas
1. Add `LocalSlmActionReceipt`: model, provider, prompt hash, tool permissions, files touched, output class, and review status.
2. Add an AWI fixture: malicious PR text must not become tool instructions.
3. Add a UI warning when a local model is installed but not verified against the repo’s test prompt suite.
4. Gate WebGPU features behind explicit capability checks and a documented fallback path.

## Risks / drift warnings
- Do not let Local SLM outputs execute or patch without a receipt.
- Do not trust GitHub event text as instructions.
- Keep visual runtime generation separated from repo-maintenance agents.

## Next suggested dev / LLM actions
- Draft `docs/LOCAL_SLM_RECEIPTS.md`.
- Add one Vitest fixture for prompt-boundary sanitization.
- Add a small UI status panel for model trust state: unknown, detected, tested, approved.
