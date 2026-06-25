# GEF Current Status

This is the repo dashboard note. Read this after the root `README.md` when resuming work.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

---

## Last updated

After PR #13 merged: local SLM setup menu for Ollama and GEF model checks.

Latest merged feature work:

- PR #10: render module registry and sandbox-only validated module preview bridge.
- PR #11: Vite, TypeScript project config, and Playwright Chromium smoke coverage.
- PR #12: Code Foundry local SLM artifact lane for validator-screened Canvas2D artifact text.
- PR #13: npm-driven local SLM setup menu for Ollama/model checks.

---

## Current verification state

GEF now has automated repo and browser rails:

- `npm run check`
- `npm run build`
- `npm run test:e2e:chromium`
- GitHub Actions for Node CI, Stack CI, Actionlint, Repo Health, Workflow Contracts, and PR Handoff Packet.

Current baseline:

- Vite serves the app locally through npm.
- TypeScript configuration exists for gradual adoption.
- Playwright Chromium smoke tests cover app boot, sandbox panic recovery, and mocked Local SLM preview behavior.
- Registry smoke checks cover curated module metadata and validator drift.
- Code Foundry smoke checks cover generated visual artifact validation.
- SLM setup smoke checks cover Ollama model-list parsing and required/optional model planning.

Do not call new work complete until CI passes on the active PR.

---

## Current implementation snapshot

### Runtime and rendering

- Canvas2D is the stable baseline.
- Curated module registry exists in `src/render/moduleRegistry.js`.
- Trusted render functions live in `src/render/visualModuleFns.js`.
- `src/render/visualModules.js` remains a compatibility wrapper.
- `src/render/canvasRuntime.js` owns main/sandbox render behavior.
- Sandbox preview is explicit and separate from main runtime.

### Audio metrics

Current audio metrics:

```text
bass, mid, treble, beat, glitch, centroid, rms
```

Key meanings:

- beat is a trigger, not BPM
- glitch reacts to change, not just volume
- centroid is brightness pressure, not mood detection

### Local SLM and Code Foundry

Implemented local SLM paths:

- Light helper lane: `llama3.2:3b`
- Code Foundry lane: `qwen2.5-coder:3b`
- Optional heavier repair lane: `qwen2.5-coder:7b`

Implemented setup command:

```bash
npm run setup:slm
```

Current SLM behavior:

- Local SLM can suggest curated modules.
- Validated curated suggestions can be previewed in sandbox only.
- Code Foundry can request generated Canvas2D artifact text.
- Generated artifact text is validator-screened and staged in the manual compiler/code viewer.
- Generated artifacts do not move into the main runtime by themselves.

### Data and memory

Implemented data safety:

- telemetry JSONL import/export exists
- imported rows start quarantined
- Library-side quarantine review exists
- reviewed-only export is enforced
- docs exist for dataset format, memory policy, and feedback memory planning

Still pending:

- full `gef-feedback-row-v1` builder
- schema validation/migration
- per-row quarantine actions
- dataset card generation
- training/eval/holdout export rails

---

## Active continuation pointer

Before starting a new patch, check `docs/TODO.md` and the latest open PRs.

Likely next build steps:

1. Add an in-app first-run Local SLM setup hint when Ollama or required models are missing.
2. Add compile-smoke validation for Code Foundry generated Canvas2D artifact bodies.
3. Add SLM request/response telemetry rows for accepted and rejected model outputs.
4. Add Playwright coverage for Code Foundry generated artifact staging.
5. Expand dataset/preset fixture validation.

Do not skip the generated-artifact review sequence:

```text
prompt
-> local coding SLM
-> structured artifact
-> static policy
-> compile smoke
-> runtime smoke
-> sandbox preview
-> user promotion
```

Current implementation stops before compile smoke.

---

## Handoff rules for the next agent

When resuming:

1. Read `README.md`.
2. Read this file.
3. Read `docs/TODO.md`.
4. Read `docs/WORKFLOW_LOOP.md`.
5. Read task-specific docs from the root README task map.
6. Inspect current GitHub PRs/issues before assuming state.
7. Fetch current files and SHAs before editing.
8. Open a focused PR unless the human explicitly asks for a direct main patch.
9. Update docs/TODO/status when the task changes project direction.
10. Leave a handoff note if context becomes tight.

A good handoff note names:

- branch
- PR number
- changed files
- validation state
- failure logs, if any
- next exact action
- safety-sensitive assumptions

---

## High-review areas

Treat these as high-review zones:

- generated artifact validation
- sandbox promotion
- renderer module registration
- provider/SLM output handling
- localStorage storage shape
- JSONL import/export
- quarantine review
- telemetry/memory/dataset promotion
- browser media APIs
- provider credential references

Keep the renderer deterministic, inspectable, and recoverable.
