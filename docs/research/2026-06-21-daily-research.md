# Daily Research Note - 2026-06-21

Status: candidate/working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- README defines GEF as a browser-based generative visual engine for audio-reactive art systems.
- Current foundation includes Canvas2D rendering, audio metrics, sandbox/main separation, presets, telemetry, local Ollama SLM suggestions, code-lane profiles, static policy screening, and WebM capture.
- Docs index points to architecture, security, audio metrics, preset/data formats, quarantine review, memory policy, testing, and SLM option planning.

## Why this matters
GEF already has a safety-first model. The best research target is hardening the validator/promotion loop before adding stronger generation lanes.

## Current external findings
- MDN’s Web Audio visualization guide recommends using `AnalyserNode` to extract audio data, then copying frequency/time data into typed arrays for visualization. Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
- MCP’s security guidance treats tool calls as arbitrary code execution paths that need consent, access controls, and documentation. Source: https://modelcontextprotocol.io/specification/2025-06-18
- GitHub Actions guidance recommends least-privilege token permissions and hardened workflow use. Source: https://docs.github.com/en/actions/reference/security/secure-use

## Candidate implementation ideas
1. Add a validator scorecard for candidate visual modules: syntax, sandbox API compliance, forbidden globals, render budget, and preset safety.
2. Add a dataset card template for promoted telemetry exports.
3. Add a “promotion receipt” format linking user feedback, validation results, and approved module IDs.
4. Keep any browser-local SLM provider read-only until module validation passes.

## Risks / drift warnings
- Do not let SLM-generated visual code bypass quarantine or static policy screening.
- Keep renderer deterministic and recoverable; models suggest, validators decide, users promote.
- Avoid expanding memory retention before the memory policy has explicit expiration and deletion checks.

## Next dev / LLM actions
- Draft validator scorecard fields.
- Add one example promotion receipt for a safe built-in module.
- Add tests for rejected generated module patterns before adding new providers.
