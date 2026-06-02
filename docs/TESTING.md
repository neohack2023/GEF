# GEF Testing

GEF testing is the safety rail for a browser-first visual engine that mixes audio analysis, canvas rendering, sandbox preview, local storage, JSONL datasets, and future SLM/LLM routing.

Core principle:

> Test the engine like a live instrument: boot it, feed it signal, watch the meters, stress the stage, record the output, and prove it forgets what it should not keep.

Testing must prove that GEF is:

- stable enough to boot
- deterministic enough to debug
- safe enough to accept imported data
- observable enough to explain failures
- portable enough to run in normal browsers
- strict enough to keep model output away from runtime authority

---

## Current implementation under test

Primary files:

```text
index.html
src/app.js
src/audio/analyzer.js
src/render/canvasRuntime.js
src/render/visualModules.js
src/storage/localLibrary.js
src/autopilot/autopilotStub.js
```

Current runtime flow:

```text
page boot
  -> bind UI
  -> bind media controls
  -> initialize code viewer
  -> render module stack
  -> render Foundry log
  -> requestAnimationFrame(renderEngine)
```

Current render loop:

```js
const metrics = audio.update(glitchThreshold, audioSense);
updateMeters(metrics);
runtime.render(window.innerWidth, window.innerHeight, globalTime, metrics);
```

Current important test surfaces:

- Canvas2D main renderer
- sandbox preview renderer
- feedback buffer
- composite capture canvas
- audio analyzer metrics
- media upload flow
- microphone permission flow
- MediaRecorder capture flow
- preset save/load/delete
- telemetry JSONL export/import
- safe Foundry/autopilot stub
- feedback accept/reject logging
- imported dataset handling

---

## Testing layers

Use layered testing.

```text
L0 Static checks
L1 Unit tests
L2 Browser smoke tests
L3 Integration tests
L4 Security/import tests
L5 Regression tests
L6 Manual creative QA
```

### L0 - Static checks

Purpose:

```text
Catch syntax, module import, formatting, schema, and obvious unsafe patterns before a browser even opens.
```

Checks:

- JavaScript syntax parses
- ES module imports resolve
- docs links resolve
- JSON examples parse
- JSON Schema examples parse
- forbidden calls are absent where required
- no hardcoded provider keys
- no direct generated-code execution path

Recommended commands:

```bash
node --check src/app.js
node --check src/audio/analyzer.js
node --check src/render/canvasRuntime.js
node --check src/storage/localLibrary.js
```

Note:

`node --check` only validates syntax. It does not validate browser globals such as `document`, `AudioContext`, or canvas APIs.

---

### L1 - Unit tests

Purpose:

```text
Test pure logic without opening a full browser.
```

Good unit-test targets:

- telemetry row normalization
- JSONL line parsing
- preset migration
- dataset row migration
- memory scoring
- retention cleanup
- clamp helpers
- module ID validation
- preview mode validation
- audio band helpers when split from analyzer

Recommended future folder:

```text
tests/unit/
  presetFormat.test.js
  datasetFormat.test.js
  memoryPolicy.test.js
  audioBands.test.js
  storage.test.js
  securityGuards.test.js
```

Unit tests should avoid:

- canvas pixel assertions unless using a stable mock
- real microphone access
- real MediaRecorder output
- real provider calls

---

### L2 - Browser smoke tests

Purpose:

```text
Prove the app boots and the visible controls work in a real browser.
```

Recommended tool:

```text
Playwright
```

Why:

- it supports Chromium, Firefox, and WebKit
- it is built for end-to-end web app testing
- it provides assertions, isolation, parallelization, and CI tooling
- it auto-waits for element actionability, which reduces flaky click tests

Suggested folder:

```text
tests/e2e/
  boot.spec.js
  sandbox.spec.js
  presets.spec.js
  telemetry.spec.js
  media.spec.js
  security.spec.js
```

Minimum smoke test:

```js
import { test, expect } from '@playwright/test';

test('GEF boots stable engine', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status-bar')).toContainText('STABLE ENGINE ACTIVE');
  await expect(page.locator('#main-canvas-2d')).toBeVisible();
  await expect(page.locator('#sandbox-toggle')).toBeVisible();
});
```

---

## Playwright setup

Recommended install:

```bash
npm init playwright@latest
```

Recommended config shape:

```js
// playwright.config.js
export default {
  webServer: {
    command: 'npx http-server . -p 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ]
};
```

CI command:

```bash
npx playwright test
```

Debug command:

```bash
npx playwright test --ui
```

---

## Browser support matrix

GEF should test three support tiers.

| Tier | Browser | Purpose |
| --- | --- | --- |
| Required | Chromium | main development and media/canvas baseline |
| Required | Firefox | non-Chromium compatibility |
| Required | WebKit | Safari-like behavior |
| Optional | Chrome Canary | future WebGPU checks |
| Optional | Edge | Windows user baseline |

Feature gates:

| Feature | Required behavior |
| --- | --- |
| Canvas2D | must work |
| Web Audio AnalyserNode | must work or show disabled audio state |
| getUserMedia | must fail safely if denied or unavailable |
| MediaRecorder | must fail safely if unsupported MIME type |
| canvas.captureStream | must fail safely if unsupported |
| WebGPU | optional, must feature-detect |
| localStorage | required for current prototype |
| IndexedDB | future storage, feature-detect |

---

## Boot test checklist

A boot test passes when:

- page loads without console errors
- status bar says stable engine active
- main canvas exists
- sandbox canvas exists
- feedback canvas exists
- composite canvas exists
- code viewer can open/close
- module stack renders
- dataset count renders
- render loop runs at least 2 frames
- no unhandled promise rejection appears

Playwright snippet:

```js
test('no console errors on boot', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});
```

---

## Render runtime tests

Current runtime rules:

- `voidCore` is the default base
- overlays start enabled
- sandbox starts inactive
- sandbox module IDs must resolve through the visual module registry
- unknown sandbox modules become `null`
- composite draws main and sandbox only when sandbox is active

Test cases:

| Test | Expected result |
| --- | --- |
| boot default runtime | base `voidCore`, overlays enabled |
| set known sandbox module | `sandboxModuleId` stores module ID |
| set unknown sandbox module | `sandboxModuleId` becomes null |
| panic reset | sandbox inactive and module cleared |
| promote overlay | overlay enabled in main stack |
| discard sandbox | sandbox module cleared |
| resize canvas | all canvases match window size |
| snapshot | returns PNG data URL |

Example unit-style browser test:

```js
test('sandbox panic clears sandbox runtime', async ({ page }) => {
  await page.goto('/');
  await page.click('#evolve-btn');
  await expect(page.locator('#status-bar')).toContainText('Safe evolve preview loaded');

  await page.click('#panic-btn');
  await expect(page.locator('#status-bar')).toContainText('Sandbox panic reset complete');
  await expect(page.locator('#sandbox-toggle')).not.toBeChecked();
});
```

---

## Audio analyzer tests

Current analyzer behavior:

- lazily creates `AudioContext`
- creates `AnalyserNode`
- sets `fftSize = 1024`
- sets `smoothingTimeConstant = 0.1`
- reads `getByteFrequencyData()`
- computes bass, mid, treble, beat, glitch, centroid, and rms
- routes media element audio to destination
- routes microphone audio without connecting to speakers

Test cases:

| Test | Expected result |
| --- | --- |
| init creates analyser | analyser and arrays exist |
| init resumes suspended context | no throw |
| no analyser update | returns last metrics |
| silent buffer | metrics remain near zero |
| bass-heavy fake buffer | bass rises more than mid/treble |
| high-bin fake buffer | centroid rises |
| positive flux | glitch triggers above threshold |
| low flux | glitch decays |
| mic route | does not connect analyser to destination |
| media route | connects analyser to destination |

Future testability improvement:

```text
Split audio math from Web Audio API.
```

Recommended future files:

```text
src/audio/audioBands.js
src/audio/metricSmoothing.js
src/audio/beatDetector.js
```

That lets unit tests feed fake arrays into pure functions without requiring a real audio device.

---

## Media tests

Current media features:

- media file upload creates object URL
- uploaded media is routed through analyzer
- microphone requests `getUserMedia({ audio: true })`
- snapshot downloads a PNG data URL
- recording uses `canvas.captureStream(30)` plus optional audio tracks
- MediaRecorder chooses WebM VP9/VP8 fallbacks

Test cases:

| Feature | Test | Expected result |
| --- | --- | --- |
| file upload | upload small audio file | status shows loaded media |
| play/pause/stop | click controls | media state changes safely |
| mic denied | deny permission | status says access denied |
| mic granted | mock permission | status says active |
| snapshot | click snapshot | download event occurs |
| record unsupported | mock MediaRecorder missing | status says recording failed |
| record supported | mock MediaRecorder | chunks collected and download created |

Do not require real microphone in CI. Use mocks.

Mock pattern:

```js
await page.addInitScript(() => {
  navigator.mediaDevices = {
    getUserMedia: async () => new MediaStream()
  };
});
```

---

## Storage and JSONL tests

Current storage targets:

```text
gef_local_presets
gef_telemetry_dataset
gef_autopilot_logs
```

Test cases:

| Area | Test | Expected result |
| --- | --- | --- |
| presets | save unnamed preset | name becomes Unnamed Pipeline |
| presets | save and load | module stack and sliders restore |
| presets | delete | preset count decreases |
| telemetry | reward logs row | dataset count increments |
| telemetry | reject logs reason | reason stored |
| export | empty dataset | status says empty |
| export | rows exist | JSONL download created |
| import | valid JSONL | rows appended |
| import | invalid JSONL | status says import failed |
| import | mixed bad line | future parser reports partial failure |

Future tests from `DATASET_FORMAT.md`:

- every row has `schemaName`
- every row has `schemaVersion`
- every import gets source/trust state
- imported rows start quarantined
- privacy flags block export if unsafe
- holdout rows cannot be used for training

---

## Preset tests

From `PRESET_FORMAT.md`, test:

- legacy v0 preset loads
- v1 preset validates
- unknown module IDs are ignored or quarantined
- imported presets force `promoteOnLoad = false`
- preset names render as text, not unsafe HTML
- module order is preserved
- required adapters are checked
- missing required adapters produce read-only or unavailable state

Regression case:

```json
{
  "name": "<img src=x onerror=alert(1)>",
  "baseModuleId": "voidCore",
  "enabledModules": ["spectralGrid"],
  "ui": {
    "speed": 1,
    "glitch": 1.5,
    "audioSense": 1,
    "preview": "AUTO"
  }
}
```

Expected:

```text
The string is displayed as text or sanitized. No script runs. No image injection happens.
```

---

## Dataset tests

From `DATASET_FORMAT.md`, test:

- legacy telemetry v0 migrates to `gef-feedback-row-v1`
- invalid JSONL line reports line number
- unknown `schemaName` is rejected
- imported rows go to quarantine
- rejected rows can become evaluation rows
- accepted high-score rows can become training candidates
- `containsSecrets = true` blocks export
- `containsMediaData = true` blocks export
- holdout split is excluded from training export

Golden JSONL test:

```jsonl
{"schemaName":"gef-feedback-row","schemaVersion":1,"id":"row_test_1","createdAt":"2026-06-01T20:00:00.000Z","sessionId":"session_test","source":{"kind":"local","trust":"trusted_local"},"event":{"type":"USER_ACCEPTED","phase":"feedback"},"input":{},"context":{},"decision":{},"validation":{"passed":true,"errors":[],"warnings":[]},"feedback":{"outcome":"accepted","tags":["usable"]},"quality":{"score":1,"shouldTrain":true,"shouldDistill":true,"split":"train"},"privacy":{"containsSecrets":false,"exportAllowed":true}}
```

---

## Memory tests

From `MEMORY_POLICY.md`, test:

- session memory clears on reload
- working memory obeys row caps
- imported memory starts quarantined
- quarantined memory is excluded from retrieval
- low-score memory decays
- expired memory is purged
- deleted source rows remove dependent memory when required
- distilled memory cites source row IDs
- provider context pack excludes raw telemetry
- provider context pack excludes secrets

Policy regression:

```text
Deletion beats retention.
```

If a user deletes memory, cleanup must not resurrect it from derived stores.

---

## Security tests

Security tests should follow `SECURITY.md` and OWASP client-side testing guidance.

Required checks:

- no hardcoded API keys
- no frontend provider secret storage
- no generated code execution path in safe foundation
- no `new Function` in active runtime
- no `eval` in active runtime
- imported JSONL is not executed
- imported preset names do not become HTML
- localStorage keys contain no secrets
- CSP target documented
- provider output validates before use
- sandbox promotion requires explicit user action
- remote provider failure cannot break stable renderer

Search command examples:

```bash
grep -R "new Function" src index.html
grep -R "eval(" src index.html
grep -R "apiKey\|secret\|token" src index.html docs
```

Browser security test examples:

```js
test('unsafe preset name does not execute HTML', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('gef_local_presets', JSON.stringify([
      {
        name: '<img src=x onerror="window.__xss = true">',
        baseModuleId: 'voidCore',
        enabledModules: [],
        ui: { speed: 1, glitch: 1.5, audioSense: 1, preview: 'AUTO' },
        timestamp: Date.now()
      }
    ]));
  });

  await page.reload();
  await page.click('#tab-library');
  expect(await page.evaluate(() => window.__xss)).toBeFalsy();
});
```

Current note:

Some current UI rendering uses template strings and `innerHTML`. Security tests should catch unsafe rendering so the code can move risky user-controlled fields to `textContent` or sanitization.

---

## Accessibility tests

GEF is visual-heavy, but UI controls still need accessible behavior.

Test:

- buttons have accessible names
- sliders have labels
- keyboard can reach major controls
- focus is visible
- color is not the only status indicator
- status bar updates are readable
- hidden panels are actually hidden from interaction
- reduced motion mode is considered later

Suggested automated tool later:

```text
axe-core with Playwright
```

Manual checks:

- tab through the UI
- operate sandbox toggle with keyboard
- operate sliders with keyboard
- confirm status changes are visible/readable

---

## Performance tests

Performance matters because GEF renders every animation frame.

Current render path:

```text
requestAnimationFrame
  -> audio.update
  -> meter DOM writes
  -> runtime.render
  -> optional composite draw while recording
```

Targets:

| Metric | Target |
| --- | ---: |
| boot to stable status | under 2 seconds |
| frame budget | under 16.7 ms for 60 FPS target |
| no-audio idle render | no obvious jank |
| sandbox toggle response | under 200 ms |
| preset save/load | under 200 ms |
| JSONL import small file | under 1 second |
| memory cleanup | non-blocking when moved to IndexedDB |

Performance instrumentation:

```js
performance.mark('gef-render-start');
runtime.render(w, h, time, metrics);
performance.mark('gef-render-end');
performance.measure('gef-render-frame', 'gef-render-start', 'gef-render-end');
```

Test policy:

- performance tests should warn before they fail
- hard failures only for severe regressions
- record browser, viewport, OS, and GPU capability when possible

---

## Visual regression tests

Visual output is generative, so avoid brittle exact-pixel expectations.

Use tiers:

| Tier | Method | Use |
| --- | --- | --- |
| Smoke | canvas not blank | required |
| Structural | expected non-zero pixel changes | required |
| Snapshot | screenshot diff tolerance | optional |
| Human review | creative quality pass | required before releases |

Canvas not blank example:

```js
const pixels = await page.locator('#main-canvas-2d').evaluate((canvas) => {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonZero = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonZero++;
  }
  return nonZero;
});
expect(pixels).toBeGreaterThan(100);
```

Avoid:

```text
exact full-canvas pixel matches for animated visuals
```

---

## Adapter tests

Future adapters:

```text
Canvas2D
GLSL/WebGL
WGSL/WebGPU
Python/Pyodide
SLM provider
LLM provider
```

Every adapter needs:

- feature detection
- schema validation
- smoke test
- failure fallback
- timeout
- diagnostics
- no direct write into stable renderer without validation

Adapter contract:

```js
{
  id: 'webgpu-wgsl',
  available: async () => Boolean(navigator.gpu),
  validate: async (candidate) => ({ ok: true, errors: [] }),
  preview: async (candidate, sandbox) => ({ ok: true }),
  dispose: async () => {}
}
```

Adapter test matrix:

| Adapter | Required tests |
| --- | --- |
| Canvas2D | render smoke, no throw, snapshot |
| WebGL | context creation, shader compile fail, fallback |
| WebGPU | secure context, navigator.gpu check, WGSL validation, fallback |
| Pyodide | load failure, timeout, no DOM authority |
| SLM | schema-valid response, timeout, bad JSON rejection |
| LLM | provider disabled without key, schema-valid response, prompt-injection rejection |

---

## Provider and model-output tests

Provider outputs are untrusted.

Test cases:

- malformed JSON rejected
- unknown module ID rejected
- unsupported stage rejected
- prompt injection text stored as text only
- provider cannot force promotion
- provider cannot disable security checks
- provider cannot write localStorage directly
- provider cannot create executable code path in safe foundation
- timeout returns safe fallback
- offline mode continues stable renderer

Safe provider rule:

```text
Models suggest. Validators decide. Users promote.
```

---

## Manual creative QA

Automated tests cannot judge the whole instrument.

Manual release pass:

- load audio file
- confirm bass/mid/treble meters react
- toggle sandbox
- evolve preview
- iterate preview
- like result
- reject result with reason
- save preset
- load preset
- export JSONL
- import JSONL
- snapshot PNG
- record short WebM where supported
- panic reset
- reload app
- confirm no broken state

Manual creative notes should include:

```text
browser
OS
audio file type
viewport
what looked wrong
what felt good
whether audio reaction matched expectation
```

---

## Release checklist

Before tagging a release:

- [ ] static syntax checks pass
- [ ] Playwright boot tests pass in Chromium
- [ ] Playwright smoke tests pass in Firefox and WebKit or failures are documented
- [ ] app boots without console errors
- [ ] stable renderer still works without audio
- [ ] audio file upload works
- [ ] microphone denial path works
- [ ] sandbox panic reset works
- [ ] preset save/load works
- [ ] telemetry export works
- [ ] invalid JSONL import fails safely
- [ ] security grep has no unsafe active runtime calls
- [ ] docs index links resolve
- [ ] manual creative QA completed

---

## Recommended test file layout

```text
tests/
  unit/
    audioBands.test.js
    datasetFormat.test.js
    memoryPolicy.test.js
    presetFormat.test.js
    securityGuards.test.js
  e2e/
    boot.spec.js
    sandbox.spec.js
    media.spec.js
    presets.spec.js
    telemetry.spec.js
    security.spec.js
    accessibility.spec.js
  fixtures/
    valid_feedback_row.jsonl
    invalid_jsonl_line.jsonl
    legacy_preset_v0.json
    unsafe_preset_name.json
    small_test_tone.wav
  helpers/
    canvas.js
    downloads.js
    storage.js
    mocks.js
```

---

## Future CI workflow

Suggested GitHub Actions outline:

```yaml
name: gef-tests

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run test:unit --if-present
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

---

## Reference notes reflected

- Playwright is an end-to-end framework for modern web apps and supports Chromium, Firefox, and WebKit with test runner, assertions, isolation, parallelization, and CI tooling.
- Playwright auto-waits for actionability checks before actions and has retrying assertions to reduce flake.
- `canvas.captureStream()` returns a `MediaStream` containing real-time canvas video capture.
- `MediaRecorder` records media streams and supports MIME/container options.
- `getUserMedia()` requires secure contexts and can be unavailable when the document is not loaded securely.
- WebGPU is not Baseline everywhere and requires secure contexts, so tests must treat it as optional and feature-detected.
- OWASP's client-side testing guide includes DOM XSS, JavaScript execution, HTML injection, browser storage, and related checks.
- WCAG defines accessibility success criteria organized around perceivable, operable, understandable, and robust principles.
- JSON Schema is useful for validating structured JSON rows and contracts.
- The Performance API provides browser timing and custom measurement hooks.

Reference URLs:

```text
https://playwright.dev/docs/intro
https://playwright.dev/docs/actionability
https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/README
https://www.w3.org/WAI/standards-guidelines/wcag/
https://json-schema.org/learn/getting-started-step-by-step
https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
```

---

## Testing maxims

- If it stores memory, test deletion.
- If it imports data, test poison.
- If it renders frames, test blankness and failure recovery.
- If it records media, test unsupported paths.
- If it talks to a model, test bad JSON first.
- If it enters sandbox, test panic reset.
- If it becomes a dataset, test lineage and privacy.
- If it looks cool once, test that it survives reload.
