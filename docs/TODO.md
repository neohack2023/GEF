# TODO

This file is the human-readable task ledger for GEF.

## Active workflow tasks

- [ ] Verify the LLM workflow loop on a test PR.
- [ ] Confirm CI uploads the `llm-ci-context` artifact on both success and failure.
- [ ] Add repo-specific validation for visual module manifests if/when a manifest is introduced.
- [ ] Add adapter/provider contract checks when provider interfaces stabilize.

## Backlog

- [ ] Add dataset fixture validation for telemetry JSONL rows.
- [ ] Add preset fixture validation for import/export compatibility.
- [ ] Add generated visual code policy regression fixtures.
- [ ] Expand Playwright coverage beyond the first Chromium boot smoke test.

## Done

- [x] Establish GEF as a browser-first generative visual engine with safety and sandbox boundaries.
- [x] Add local SLM lane planning and documentation.
- [x] Add current `npm run check` script for syntax and security scanning.
- [x] Add ESLint flat config and wire linting into `npm run check`.
- [x] Add Playwright Chromium boot smoke harness.
