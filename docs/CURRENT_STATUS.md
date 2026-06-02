# GEF Current Status

Last updated after adding repo-side project check scripts.

This file is the quick handoff note for where the repo currently stands. Deeper design rules live in the specific docs; this page is the dashboard sticky note.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

---

## Current verification state

GEF is partially smoke-tested but does not have an automated browser test harness yet.

Observed so far:

- Hosted static deployment runs on mobile from `https://gtterminal.neocities.org/systems/Gef/Index`.
- The app is not globally broken on the hosted Neocities path.
- Default `voidCore` render appears.
- Meters render at zero without audio.
- Sliders update labels.
- Studio, Foundry, and Library tabs switch.
- Laptop Edge showed browser/CSP-style behavior around `blob:` media and a stale/optional Pyodide source-map request.
- The laptop issue is currently treated as browser/deployment-specific until reproduced elsewhere.
- Full local laptop smoke testing is still pending.
- Playwright or other automated browser tests are not implemented yet.
- Repo-side scripts now exist for local static serving, syntax checks, and a small security scan, but they still need to be run in a local checkout.

Current assumption:

```text
Proceed carefully from a partially smoke-tested foundation.
```

---

## Recently completed

### Preset and Foundry log rendering hardened

Commit:

```text
a0e27f2090377e4a1a75c1cc52d309c9e1ce9611
```

What changed:

- Preset card rendering no longer injects preset names through `innerHTML`.
- Foundry/autopilot log rendering no longer injects log messages through `innerHTML`.
- User/import/log text is rendered through DOM nodes and `textContent`.

Why it matters:

```text
Imported or user-controlled text should display as text, not become markup.
```

Remaining note:

- `renderModuleStack()` still uses `innerHTML` with curated module metadata. This is lower risk while module metadata is local and trusted, but should be cleaned when the module registry is formalized.

### JSONL import parsing hardened

Commit:

```text
56ea53725170ef928b294d3c4ed722c9d9bd4997
```

What changed:

- Added JSONL import limits:
  - 2 MB max file size
  - 5000 max rows
  - 10000 max characters per line
  - 5 max reported errors in the status summary
- Import now parses line-by-line.
- Blank lines are skipped.
- Non-object JSON rows are rejected.
- Oversized lines are rejected.
- Mixed files can import valid rows while reporting bad lines.
- Read failures report a clear status message.

### Imported telemetry rows now start quarantined

Commits:

```text
cbe43e8cf5fc3e1c7dd47a462f4006376bfd3604 - Add telemetry import quarantine state
8876d2b7c6f7a8e4223235040577d789736055ca - Preserve JSONL import line numbers
```

What changed:

- Parsed JSONL rows now preserve their original source line number.
- `importTelemetryRows(rows, metadata)` accepts import metadata.
- Imported rows are wrapped with `_gefImport` metadata.
- `_gefImport.state` is set to `quarantined`.
- `_gefImport.schemaStatus` is set to `unvalidated`.
- `_gefImport.reviewed` is set to `false`.
- Import metadata includes file name, imported timestamp, original index, line number, and parser version.
- Import status messages now say `quarantined rows` instead of silently treating imports as trusted telemetry.

Current behavior examples:

```text
Valid file:
Imported 12 quarantined telemetry rows. Total: 12.

Mixed valid and invalid file:
Imported 10 quarantined rows, rejected 2. line 3: ...

Oversized file:
Import blocked: file exceeds 2 MB.

Only bad rows:
Import rejected 1 lines. First error line 1: ...
```

Important limitation:

- Imported rows are quarantined and line-tagged, but they are not yet schema-normalized into `gef-feedback-row-v1`.
- There is no quarantine review UI yet.
- There is no promote/reject quarantine workflow yet.
- Raw telemetry is still not training data.

### Media capability checks and browser/CSP warnings added

Commit:

```text
13001d7a3c525babfcc7244a83673317500a86db - Add media capability checks
```

What changed:

- Added media capability detection for:
  - object URL support
  - `navigator.mediaDevices.getUserMedia`
  - `canvas.captureStream`
  - `MediaRecorder`
  - `MediaRecorder.isTypeSupported`
- Added preferred WebM MIME selection before recording.
- Added boot-time media capability warnings for unsupported media paths.
- Media upload now fails visibly if object URLs are unsupported.
- Media upload now reports likely `blob:`/CSP blocking through the status bar.
- Microphone flow now fails visibly when `getUserMedia` is unavailable, denied, or blocked by browser context.
- Recording now fails visibly when `canvas.captureStream`, `MediaRecorder`, or object URLs are unavailable.
- Recording fallback can create a `MediaRecorder` without a MIME type when type detection is unavailable.
- Object URLs are now cleaned up through a delayed revoke helper for downloads and recording exports.
- Uploaded media object URLs are revoked before replacing them with a new upload.
- The media element source is reused instead of creating a new `MediaElementSourceNode` on every upload.

Why it matters:

```text
Media export and capture paths should fail loudly, not mysteriously.
```

### Project check scripts added

Commits:

```text
0f46957ee05adf7803bf907a4a214e6672cfdf60 - Add project check scripts
d4a71e80ac8c474f89d132fa066aa629c4541cad - Add security scan helper
```

What changed:

- Added `package.json` with scripts for:
  - `npm run dev`
  - `npm run check`
  - `npm run check:syntax`
  - `npm run check:security`
  - `npm run smoke:manual`
- `npm run dev` starts the existing Python static server on port 8080.
- `npm run check:syntax` runs `node --check` across the current JavaScript modules.
- `npm run check:security` runs `tools/security-scan.mjs`.
- The security scan searches `index.html` and `src/` for review-triggering patterns including `eval(`, `new Function`, API key wording, secret wording, and bearer-token-looking strings.

Important limitation:

```text
These scripts are present in the repo, but they have not yet been run and verified in the user's local checkout.
```

---

## Current implementation limits

### Evolve and iterate

Evolve/iterate currently stage curated sandbox modules.

They do not yet synthesize new visuals through an LLM or SLM provider.

Current behavior:

```text
Evolve -> stages spectralGrid in sandbox
Iterate -> stages chromaSlice in sandbox
```

Expected future behavior:

```text
Prompt -> provider suggestion -> schema validation -> sandbox preview -> user promotion
```

### Foundry / Autopilot

Foundry remains a safe stub.

It can generate seed ideas and queue safe notes, but it should not be treated as a live provider system yet.

No frontend provider keys should be added.

### Dataset and memory

Current telemetry is still legacy local JSONL plus `_gefImport` metadata for imported rows.

The repo now has docs and partial implementation for:

- safer JSONL parsing
- per-row import line provenance
- import quarantine state
- `gef-feedback-row-v1`
- memory scoring and retention
- dataset split policy
- import quarantine policy

Still pending:

- full `gef-feedback-row-v1` row builder
- schema validation/migration
- quarantine review UI
- training/eval/holdout export gates
- memory promotion workflow

### Media and browser support

Media support is now feature-detected, but not automatically cross-browser verified.

Still pending:

- manual verification on laptop Edge after clearing cache/site data
- local-server smoke test
- Chromium/Firefox/WebKit automated smoke coverage
- explicit CSP header/meta review for hosted deployment

### Testing and automation

Basic repo-side checks now exist, but this is not yet a full browser test harness.

Still pending:

- local execution of `npm run check`
- Playwright installation/configuration
- boot smoke test
- sandbox panic test
- preset save/load test
- JSONL import/export tests
- media unsupported-path tests
- GitHub Actions workflow

---

## Next recommended build step

Next target:

```text
Run local checks, finish Phase 0 manual smoke checks, then add Playwright.
```

Build goals:

- Run `npm run check` locally.
- Run `npm run dev` locally and open `http://localhost:8080`.
- Confirm local-server boot.
- Confirm `src/app.js` loads as an ES module locally.
- Confirm sandbox toggle and panic reset behavior.
- Confirm preset save/load/delete behavior.
- Confirm JSONL export/import behavior after quarantine changes.
- Confirm media upload/mic/recording behavior on the laptop browser that showed CSP symptoms.
- Add repeatable Playwright smoke tests after manual checks stabilize.

Why this is next:

```text
The project now has a starter check loop. The app needs local execution results and browser smoke tests before bigger architecture work.
```

---

## Manual tests to run next

Run checks:

```bash
npm run check
```

Run local server:

```bash
npm run dev
```

Open:

```text
http://localhost:8080
```

Test checklist:

- App boots.
- Main canvas renders.
- Status shows stable engine active.
- Sliders update labels.
- Studio, Foundry, and Library tabs switch.
- Sandbox toggle works.
- Panic reset clears sandbox state.
- Save/load/delete preset works.
- Unsafe preset name displays as text.
- Foundry logs display as text.
- Valid JSONL imports as quarantined rows.
- Invalid JSONL reports line errors.
- Mixed JSONL imports valid rows as quarantined and reports bad lines.
- Oversized JSONL is blocked.
- Imported rows include `_gefImport.state = "quarantined"` and a source line number.
- Media upload works where browser policy allows it.
- Media upload reports a useful message if `blob:` media is blocked.
- Microphone path either works or reports denial/unavailable clearly.
- Recording either works or reports unsupported clearly.
- Recording export creates a WebM where supported.

---

## Short next-session prompt

Use this if resuming later:

```text
Continue GEF from CURRENT_STATUS.md. Phase 1 hardening now includes preset/Foundry log text rendering, safer JSONL import parsing, import quarantine metadata with line-number provenance, and media capability/CSP warning checks. Repo-side starter scripts now include npm run dev, npm run check:syntax, and npm run check:security, but local execution still needs verification. Next: run local checks and Phase 0 manual smoke tests, then add Playwright. Do not implement LLM/SLM provider generation yet. Keep changes small and verify against live GitHub before committing.
```
