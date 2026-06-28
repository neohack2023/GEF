# Daily Research Note - 2026-06-28

Status: candidate / working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- README defines GEF as a browser-based generative visual engine with audio reactivity, sandbox preview, telemetry, local Ollama SLM lanes, and validator-controlled module promotion.
- The rule of thumb is: models may suggest, validators decide, users promote.
- Recent commits include cleanup/noop activity, so this note stays focused on durable architecture rather than assuming a feature change.

## Why this matters
GEF’s power comes from generated visual candidates, but its safety comes from promotion receipts. The next useful research lane is a validator artifact format that tells the developer why a visual module is safe enough to preview or promote.

## Useful findings
- GitHub recommends least-privilege workflow tokens, treating untrusted PR content carefully, and pinning third-party actions by SHA when possible. Source: https://docs.github.com/en/actions/reference/security/secure-use
- MDN documents `AnalyserNode` as the Web Audio API node for FFT/time-domain data, matching GEF’s audio metrics direction. Source: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- MDN WebGPU guidance supports capability-gated acceleration rather than assuming universal GPU access. Source: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MCP/tool-security research reinforces explicit provenance and tool boundary checks for future agent lanes. Source: https://arxiv.org/abs/2512.06556

## Implementation ideas
1. Add `ModulePromotionReceipt`: candidate id, source prompt, validator checks, rejected APIs, render-smoke result, audio-metric bindings, and user decision.
2. Add a fixture for a generated module that renders but is rejected for unsafe API use.
3. Extend Playwright smoke coverage with one deterministic audio-metric snapshot and one module rollback case.
4. Keep WebGPU as a capability-gated adapter, not a replacement for current Canvas2D stability.

## Risks / drift warnings
- Do not allow local SLM suggestions to bypass static policy screening.
- Do not promote visual code only because it looks good once.
- Keep telemetry local-first and reviewable.

## Next dev / LLM actions
- Draft `docs/MODULE_PROMOTION_RECEIPT.md`.
- Add one unsafe-module validator fixture.
- Add a rollback receipt to the sandbox recovery test plan.
