# Daily Research Note - 2026-06-22

Status: candidate/working note for developer + LLM review. Do not treat as canon until reviewed.

## Repo context read
- README and docs frame GEF as a browser-based generative visual engine with audio reactivity, sandbox/main separation, presets, telemetry, quarantine review, and local SLM suggestion lanes.
- Prior research notes point toward validator/promotion hardening before adding stronger generation lanes.
- Recent issue context shows a Node CI failure in `manualCompilerAssist.js`, so self-repair should turn CI failures into narrow repair packets rather than broad refactors.

## Why this matters
GEF is entering the code-forge zone: generated visual modules, compiler assists, and repair suggestions need a tight failure-to-fix loop. The useful target is an auditable self-repair receipt, not more autonomous code freedom.

## Useful findings with sources
- GitHub Actions secure-use guidance recommends least-privilege workflow tokens and careful handling of untrusted content, especially privileged triggers. Source: https://docs.github.com/en/actions/reference/security/secure-use
- MCP security guidance reinforces explicit consent, access controls, and tool-safety documentation for AI-connected tool paths. Source: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- Vitest provides a modern test runner path for Vite/JS projects and can support focused unit tests around compiler helpers. Source: https://vitest.dev/guide/

## Candidate implementation ideas
1. Add a `RepairPacket` format for CI failures: failing command, file, line, suspected cause, allowed edit scope, and forbidden drift.
2. Add a validator test for `manualCompilerAssist.js` that locks expected exports or runtime strings before any repair bot touches it.
3. Add a `docs/SELF_REPAIR_LOOP.md` note: CI detects, LLM proposes, tests verify, human merges.
4. Extend the generated-module scorecard with a `repair_context` section so future fixes are replayable.

## Risks / drift warnings
- Do not let self-repair rewrite unrelated visual modules while fixing a compiler assist.
- Keep local SLM output advisory until tests and validator receipts pass.
- Avoid privileged workflow triggers that check out untrusted code.

## Next dev / LLM actions
- Convert the current CI failure into one sample `RepairPacket`.
- Add a minimal test around the failing compiler-assist path.
- Document the boundary between visual-generation validation and CI self-repair validation.
