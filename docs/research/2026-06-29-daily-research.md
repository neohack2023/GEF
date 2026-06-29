# Daily Research Note - 2026-06-29

Status: candidate / working note for developer and LLM review only.

## Repo context read
- README defines GEF as a browser-based generative visual engine for audio-reactive art systems.
- Current foundation includes Canvas2D runtime, audio metrics, sandbox/main preview separation, preset save/load, telemetry quarantine, SLM setup lanes, policy screening, Playwright smoke tests, and snapshot/WebM capture.
- The rule of thumb is explicit: models may suggest, validators decide, users promote.
- Open issue context includes a Node CI failure with a handoff packet, so self-repair/CI receipts are already part of the workflow language.

## Why this matters
GEF has enough moving parts that the next useful research should strengthen validator-led repair loops, not broaden generated-code autonomy. The repo can become a strong pattern for safe creative automation if every model suggestion produces a receipt and every promotion has deterministic checks.

## Useful findings
- GitHub Actions secure-use guidance recommends least-privilege `GITHUB_TOKEN`, avoiding dangerous privileged checkouts, and pinning/reviewing third-party actions: https://docs.github.com/en/actions/reference/security/secure-use
- MDN documents `AnalyserNode` as the Web Audio API node for FFT/time-domain data, matching GEF's audio metrics lane: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- MDN WebGPU guidance supports capability detection and progressive enhancement, useful for future WebGPU/WGSL lanes without breaking Canvas2D baseline: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MCP security research reinforces descriptor/tool poisoning risks, relevant to future model/provider adapters: https://arxiv.org/abs/2512.06556

## Candidate implementation ideas
1. Add a `repair-packet` JSON schema for CI failures: file, line, command, failure class, suspected boundary, and required validation command.
2. Add validator tests that reject generated visual modules touching network, DOM globals outside the sandbox contract, storage APIs, or dynamic imports.
3. Add a WebGPU readiness note that requires Canvas2D parity fixtures before WGSL modules can be promoted.
4. Add a telemetry receipt sample showing raw imported rows, quarantine decision, and reviewed export.

## Risks / drift warnings
- Do not let SLM/code-foundry suggestions skip static policy screening.
- Do not convert WebGPU into the default renderer before capability and fallback gates exist.
- Avoid hidden learning loops that mutate presets or modules without user promotion.

## Next suggested dev / LLM actions
- Turn the CI handoff format into a documented fixture.
- Add a small validator-regression pack for generated module hazards.
- Keep Canvas2D as the stable reference lane while researching WebGPU adapters.