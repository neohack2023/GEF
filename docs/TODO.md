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
- [ ] Optionally move legacy UI imports from `visualModules.js` to `moduleRegistry.js` after the compatibility wrapper is no longer useful.
- [ ] Expand browser smoke coverage beyond Chromium boot and mocked Local SLM preview.
- [ ] Gradually migrate browser modules from JavaScript to TypeScript after the Vite/TypeScript toolchain settles.
- [ ] Add compile-smoke and sandbox-preview gates for generated Code Foundry artifacts after static validation proves stable.
- [ ] Add checked-in examples from successful real local SLM smoke runs after human review.

## Done

- [x] Establish GEF as a browser-first generative visual engine with safety and sandbox boundaries.
- [x] Add local SLM lane planning and documentation.
- [x] Add current `npm run check` script for syntax and security scanning.
- [x] Add ESLint flat config and wire linting into `npm run check`.
- [x] Add initial render module registry scaffold for runtime/provider lookups.
- [x] Remove duplicated module catalog metadata from `visualModules.js`.
- [x] Add sandbox-only Preview Suggestion flow for validated Local SLM module choices.
- [x] Add registry smoke checks for metadata, render lookup, and SLM suggestion validation drift.
- [x] Add Vite-hosted npm local dev flow and TypeScript project configuration.
- [x] Add Playwright Chromium smoke tests for boot, sandbox panic, and mocked Local SLM Preview Suggestion.
- [x] Add Code Foundry local SLM lane for validator-screened Canvas2D artifact generation.
- [x] Add npm-driven local SLM setup menu for Ollama/model checks.
- [x] Add real local SLM smoke runner for installed Ollama models.
