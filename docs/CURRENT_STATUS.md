# GEF Current Status

Last updated after the first Phase 1 hardening passes.

This file is the quick handoff note for where the repo currently stands. Deeper design rules live in the specific docs; this page is the dashboard sticky note.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

---

## Current verification state

GEF is partially smoke-tested but does not have an automated test harness yet.

Observed so far:

- Hosted static deployment runs on mobile from `https://gtterminal.neocities.org/systems/Gef/Index`.
- The app is not globally broken on the hosted Neocities path.
- Laptop Edge showed browser/CSP-style behavior around `blob:` media and a stale/optional Pyodide source-map request.
- The laptop issue is currently treated as browser/deployment-specific until reproduced elsewhere.
- Full local laptop smoke testing is still pending.
- Playwright or other automated browser tests are not implemented yet.

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

Current behavior examples:

```text
Valid file:
Imported 12 telemetry rows. Total: 12.

Mixed valid and invalid file:
Imported 10 rows, rejected 2. line 3: ...

Oversized file:
Import blocked: file exceeds 2 MB.

Only bad rows:
Import rejected 1 lines. First error line 1: ...
```

Important limitation:

- Imported rows are safer to parse now, but they are not yet schema-normalized into `gef-feedback-row-v1`.
- Imported rows do not yet get a formal quarantine wrapper.
- Raw telemetry is still not training data.

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

Current telemetry is still legacy local JSONL.

The repo now has docs for:

- `gef-feedback-row-v1`
- memory scoring and retention
- dataset split policy
- import quarantine policy

But those docs are not fully implemented in code yet.

---

## Next recommended build step

Next Phase 1 target:

```text
Add media capability checks and browser/CSP warnings
```

Build goals:

- Feature-detect `navigator.mediaDevices.getUserMedia`.
- Feature-detect `canvas.captureStream`.
- Feature-detect `MediaRecorder`.
- Feature-detect supported WebM mime types before recording.
- Show clear status messages when recording is unsupported.
- Show clear status messages when microphone access is unavailable or denied.
- Show clear status messages when media `blob:` URLs are blocked by browser/CSP policy.
- Add safer object URL cleanup for media uploads/downloads.

Why this is next:

```text
The Neocities mobile path works, but laptop Edge surfaced browser/CSP behavior. Media paths should fail visibly instead of silently.
```

---

## Manual tests to run next

Run from local server:

```bash
python -m http.server 8080
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
- Valid JSONL imports.
- Invalid JSONL reports line errors.
- Mixed JSONL imports valid rows and reports bad lines.
- Oversized JSONL is blocked.
- Media upload works where browser policy allows it.
- Microphone path either works or reports denial/unavailable clearly.
- Recording either works or reports unsupported clearly.

---

## Short next-session prompt

Use this if resuming later:

```text
Continue GEF from CURRENT_STATUS.md. Phase 1 completed so far: preset/Foundry log text rendering hardening and safer JSONL import parsing. Next: add media capability checks and browser/CSP warnings. Do not implement LLM/SLM provider generation yet. Keep changes small and verify against live GitHub before committing.
```
