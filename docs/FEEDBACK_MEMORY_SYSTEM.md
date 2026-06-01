# GEF Feedback and Memory System Plan

The original GEF design had a powerful idea hiding inside the Autopilot loop: every generation attempt becomes training evidence.

This document turns that idea into a clean system for LLM, SLM, and future fine-tuning workflows.

GEF should not simply ask a model for visuals. GEF should observe what happened, score the result, remember the lesson, and use that memory to make the next run smarter.

Core loop:

```text
Prompt -> Plan -> Module Choice -> Preview -> Validation -> User Feedback -> Dataset Row -> Memory Update -> Better Next Choice
```

The feedback system is the growing brain. The model is only one worker inside it.

---

## Design goals

- Capture useful feedback without annoying the user.
- Turn every accepted/rejected result into structured training data.
- Support both cloud LLM and local SLM providers.
- Improve module selection over time.
- Improve prompt rewriting over time.
- Reduce repeat failures.
- Keep memory small, searchable, and explainable.
- Avoid storing unnecessary raw noise forever.
- Keep private user data local unless explicitly exported.

---

## What the original design was doing

The original single-file Autopilot design included these important feedback pieces:

- Session telemetry dataset in `localStorage`.
- `likedFragments` and `rejectedFragments` short-term arrays.
- User reward button.
- User reject button with a reason field.
- Auto-reroll after rejection.
- Autopilot logs.
- Training rows containing prompt, generated output, outcome, and repair metadata.
- JSONL export for future training or analysis.

That was the right instinct. The next version should keep the idea but split it into layers.

---

## Recommended file layout

```text
src/
  memory/
    feedbackStore.js
    memoryManager.js
    memorySchemas.js
    memoryReducer.js
    memorySearch.js
    memoryExport.js
    scoring.js
  slm/
    slmRouter.js
    tasks/
      classifyFeedback.js
      chooseModuleFromMemory.js
      summarizeMemory.js
      rewritePromptWithMemory.js
  storage/
    indexedDbStore.js
    localLibrary.js
  telemetry/
    eventLogger.js
    datasetWriter.js
    jsonlExport.js
```

Docs:

```text
docs/
  FEEDBACK_MEMORY_SYSTEM.md
  DATASET_FORMAT.md
  MEMORY_POLICY.md
```

---

## Memory layers

GEF should use layered memory, not one giant pile.

### Layer 1 — Session buffer

Short-lived memory for the current browser session.

Use for:

- Last prompt.
- Last module choice.
- Recent user likes/dislikes.
- Current run diagnostics.
- Current audio metrics snapshot.

Storage:

```js
const sessionMemory = {
  recentRuns: [],
  recentLikes: [],
  recentRejects: [],
  activeIntent: null,
  activeStage: null
};
```

Retention:

- Keep last 20 to 50 events.
- Clear on page reload unless explicitly saved.

---

### Layer 2 — Local event log

Append-only structured feedback rows.

Use for:

- JSONL export.
- Debugging model behavior.
- Replaying failed cases.
- Building future fine-tuning datasets.

Storage option:

- Start with `localStorage` for simple prototypes.
- Move to IndexedDB when records grow.

Retention:

- Keep full event log until user clears it.
- Add export/import tools.

---

### Layer 3 — Distilled memory

Compressed lessons extracted from many events.

Examples:

```text
User likes dense spectral grids when bass energy is high.
User rejects flat rectangles and low-motion overlays.
For prompts mentioning 'data storm', spectralGrid works better than beatBloom.
For BASE stage, avoid overlays unless user requests stack mode.
```

Use for:

- Prompt rewriting.
- Module scoring.
- SLM routing.
- Avoiding repeated failures.

Retention:

- Keep compact, human-readable summaries.
- Update after every 5 to 20 feedback events.

---

### Layer 4 — Searchable memory index

A searchable index of useful prior cases.

Use for:

- Finding similar previous prompts.
- Reusing successful recipes.
- Comparing current prompt against past failures.
- Feeding a small context pack into SLM or LLM.

Storage options:

- Simple keyword search first.
- Later add embeddings with browser-local models.
- Later add vector search through local server if needed.

Retention:

- Keep only high-signal cases.
- Prefer accepted results and clearly labeled rejections.

---

## Event types

Use stable event names so the dataset stays analyzable.

```js
export const FEEDBACK_EVENTS = {
  PROMPT_SUBMITTED: 'PROMPT_SUBMITTED',
  INTENT_CLASSIFIED: 'INTENT_CLASSIFIED',
  MODULE_CHOSEN: 'MODULE_CHOSEN',
  SANDBOX_PREVIEWED: 'SANDBOX_PREVIEWED',
  VALIDATION_PASSED: 'VALIDATION_PASSED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  USER_ACCEPTED: 'USER_ACCEPTED',
  USER_REJECTED: 'USER_REJECTED',
  USER_EDITED_PROMPT: 'USER_EDITED_PROMPT',
  MEMORY_DISTILLED: 'MEMORY_DISTILLED',
  DATASET_EXPORTED: 'DATASET_EXPORTED'
};
```

---

## Dataset row format

Every meaningful run should become one JSON row.

```js
const feedbackRow = {
  schemaVersion: 1,
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  sessionId,

  input: {
    userPrompt: 'glitchy bass-reactive data storm',
    selectedStage: 'OVERLAY',
    provider: 'mock_slm',
    model: 'mock-v0'
  },

  context: {
    activeBase: 'voidCore',
    enabledModules: ['spectralGrid', 'beatBloom'],
    audioSnapshot: {
      bass: 0.72,
      mid: 0.34,
      treble: 0.48,
      beat: 1,
      glitch: 0.63,
      centroid: 0.41,
      rms: 0.55
    }
  },

  decision: {
    intent: 'overlay',
    moduleId: 'spectralGrid',
    parameterHints: {
      density: 1.2,
      opacity: 0.8
    },
    confidence: 0.78,
    reason: 'Prompt asks for data storm structure and audio-reactive motion.'
  },

  validation: {
    passed: true,
    errors: [],
    renderFramesTested: 8
  },

  feedback: {
    outcome: 'accepted',
    userRating: 1,
    reason: '',
    tags: ['good_motion', 'audio_reactive', 'usable']
  },

  memory: {
    shouldDistill: true,
    importance: 0.7,
    expiresAt: null
  }
};
```

---

## JSONL export format

Each row should be one line.

```jsonl
{"schemaVersion":1,"eventType":"USER_ACCEPTED","input":{"userPrompt":"glitch data storm"},"decision":{"moduleId":"spectralGrid"},"feedback":{"outcome":"accepted"}}
{"schemaVersion":1,"eventType":"USER_REJECTED","input":{"userPrompt":"liquid chrome bloom"},"decision":{"moduleId":"beatBloom"},"feedback":{"outcome":"rejected","reason":"too plain"}}
```

This can be reused for:

- Prompt tuning.
- SLM evaluation.
- Future fine-tuning.
- Regression testing.
- Human review.

---

## Feedback tags

Use lightweight tags instead of relying only on freeform text.

Positive tags:

```text
good_motion
audio_reactive
usable
strong_base
strong_overlay
clean_colors
good_depth
matches_prompt
worth_saving
```

Negative tags:

```text
too_plain
too_noisy
too_dark
too_bright
not_audio_reactive
wrong_stage
weak_motion
muddy_colors
bad_depth
missed_prompt
performance_issue
```

UI idea:

```text
Why reject?
[ Too plain ] [ Too noisy ] [ Wrong stage ] [ Not audio-reactive ] [ Bad colors ] [ Other: ______ ]
```

---

## Scoring system

Every result can produce a score.

```js
export function scoreFeedback(row) {
  let score = 0;

  if (row.feedback?.outcome === 'accepted') score += 1;
  if (row.feedback?.outcome === 'rejected') score -= 1;
  if (row.validation?.passed === false) score -= 0.75;
  if (row.feedback?.tags?.includes('matches_prompt')) score += 0.5;
  if (row.feedback?.tags?.includes('not_audio_reactive')) score -= 0.5;
  if (row.feedback?.tags?.includes('performance_issue')) score -= 0.4;

  return Math.max(-2, Math.min(2, score));
}
```

Use this score for:

- Ranking prior examples.
- Choosing examples for SLM context.
- Deciding what to distill.
- Deciding what to forget.

---

## Memory distillation

Do not feed raw history forever. Compress it.

Every N feedback rows, run a distillation pass.

Input:

```js
const recentRows = feedbackStore.getRecent({ limit: 20 });
```

Output:

```js
const distilledMemory = {
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  sourceRowIds: recentRows.map((row) => row.id),
  rules: [
    {
      pattern: "prompts mentioning data, grid, scan, or telemetry",
      preference: "prefer spectralGrid or chromaSlice",
      confidence: 0.76
    },
    {
      pattern: "rejections tagged too_plain",
      preference: "increase motion density and add beatBloom only on beat-heavy audio",
      confidence: 0.64
    }
  ],
  avoid: [
    "flat rectangles for BASE stage",
    "low-opacity overlays when user asks for aggressive visuals"
  ]
};
```

SLM task:

```text
Summarize the last 20 feedback rows into compact rules for future visual selection. Return JSON only.
```

---

## Retrieval pack for SLM / LLM

Before asking a model to make a decision, build a tiny context pack.

```js
const contextPack = {
  currentPrompt,
  selectedStage,
  availableModules,
  currentAudioMetrics,
  topMemories: memorySearch.findRelevant(currentPrompt, { limit: 5 }),
  recentRejectPatterns: memoryManager.getRecentRejectPatterns(),
  userPreferences: memoryManager.getDistilledPreferences()
};
```

The model should see only the smallest useful memory pack.

Rule:

> Retrieve narrow, decide fast, store structured.

---

## Memory search strategy

Start simple.

### Version 1 — Keyword scoring

```js
export function keywordScore(query, text) {
  const q = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  const t = new Set(text.toLowerCase().split(/\W+/).filter(Boolean));

  let score = 0;
  for (const token of q) {
    if (t.has(token)) score++;
  }
  return score / Math.max(1, q.size);
}
```

### Version 2 — Tag matching

```js
export function tagScore(currentTags, memoryTags) {
  const memorySet = new Set(memoryTags);
  const overlap = currentTags.filter((tag) => memorySet.has(tag));
  return overlap.length / Math.max(1, currentTags.length);
}
```

### Version 3 — Embedding search

Later options:

- Browser embeddings with Transformers.js.
- Local embeddings through Ollama.
- Local vector index in IndexedDB.
- Export to external tooling for research.

---

## Memory management policy

Not every row deserves permanent memory.

Keep:

- Accepted results.
- Rejections with clear reasons.
- Validation failures with useful errors.
- High-confidence SLM choices.
- Repeated patterns.
- User-edited prompt improvements.

Compress:

- Similar accepted runs.
- Repeated reject reasons.
- Old logs with no user feedback.

Forget or downrank:

- Empty prompts.
- Aborted runs.
- Failed previews with no useful error.
- Very old low-score rows.
- Duplicates.

Policy snippet:

```js
export function shouldKeepMemory(row) {
  if (row.feedback?.outcome === 'accepted') return true;
  if (row.feedback?.outcome === 'rejected' && row.feedback?.reason) return true;
  if (row.validation?.passed === false && row.validation?.errors?.length) return true;
  return false;
}
```

---

## Storage plan

### Start with localStorage

Good for:

- Current prototype.
- Small datasets.
- Simple export/import.

Limits:

- Small quota.
- Synchronous API.
- Not ideal for large logs.

### Move to IndexedDB

Good for:

- Larger event logs.
- Indexed lookup by prompt, tag, module, timestamp.
- Memory search.
- Future embedding storage.

Recommended stores:

```text
gef_events
gef_feedback_rows
gef_distilled_memories
gef_embeddings
gef_settings
```

Snippet:

```js
const request = indexedDB.open('gef_memory', 1);

request.onupgradeneeded = () => {
  const db = request.result;
  db.createObjectStore('feedback_rows', { keyPath: 'id' });
  db.createObjectStore('distilled_memories', { keyPath: 'id' });
  db.createObjectStore('settings', { keyPath: 'key' });
};
```

Useful references:

- MDN Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN Storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

---

## SLM feedback tasks

The SLM should do small structured jobs.

### Task: classify feedback

Input:

```js
{
  reason: 'too flat and not reactive enough',
  moduleId: 'beatBloom',
  stage: 'POST_FX'
}
```

Output:

```json
{
  "sentiment": "negative",
  "tags": ["too_plain", "not_audio_reactive"],
  "suggestedAdjustment": "increase motion density and bind effect strength to bass or rms",
  "confidence": 0.82
}
```

### Task: choose next module using memory

Input:

```js
{
  prompt: 'violent data storm reacting to bass hits',
  stage: 'OVERLAY',
  availableModules: ['spectralGrid', 'beatBloom', 'chromaSlice'],
  relevantMemories: [
    'User liked spectralGrid for data storm prompts.',
    'User rejected beatBloom alone as too plain.'
  ]
}
```

Output:

```json
{
  "moduleId": "spectralGrid",
  "parameterHints": {
    "density": 1.4,
    "opacity": 0.85
  },
  "reason": "Matches data storm preference and avoids prior beatBloom-only rejection.",
  "confidence": 0.86
}
```

### Task: distill memory

Input:

```js
{
  recentFeedbackRows: []
}
```

Output:

```json
{
  "rules": [
    {
      "pattern": "data/glitch/grid prompts",
      "preference": "prefer spectralGrid with chromaSlice",
      "confidence": 0.8
    }
  ],
  "avoid": ["beatBloom alone for complex prompts"],
  "summary": "User prefers layered structured motion over single pulse effects."
}
```

---

## UI plan

Add a feedback panel after each sandbox preview.

```text
FEEDBACK
[ Looks Good ]
[ Reject ] Reason: __________________
Tags:
[ Too Plain ] [ Too Noisy ] [ Wrong Stage ] [ Not Audio Reactive ] [ Bad Colors ] [ Slow ]
[ Save as Training Row ] [ Export Memory ]
```

Add a Memory tab or Library subsection:

```text
MEMORY
Events: 248
Accepted: 71
Rejected: 39
Distilled Rules: 12
Storage: localStorage / IndexedDB
[ Export JSONL ] [ Import JSONL ] [ Distill Now ] [ Clear Low-Value Logs ]
```

---

## First implementation milestone

Minimum useful feedback system:

1. Add `src/memory/feedbackStore.js`.
2. Replace loose telemetry calls with structured feedback rows.
3. Add accept/reject tags.
4. Export JSONL.
5. Add `scoreFeedback(row)`.
6. Add keyword-based memory search.
7. Add a simple `distilledMemory` array in localStorage.
8. Feed top 3 memories into SLM module-choice prompts.

This gets GEF learning without needing model fine-tuning yet.

---

## Fine-tuning / training path

The dataset can support three levels of learning.

### Level 1 — In-context memory

No training required.

GEF retrieves prior memories and includes them in SLM/LLM requests.

Best first step.

### Level 2 — Preference ranking

Use accepted vs rejected rows to rank module choices.

Example:

```text
Prompt: data storm
Accepted: spectralGrid + chromaSlice
Rejected: beatBloom alone
```

This can train or tune a small scorer later.

### Level 3 — Fine-tuning

Only after enough clean rows exist.

Possible training examples:

```json
{
  "input": "Prompt: glitchy bass data storm. Stage: OVERLAY. Modules: spectralGrid, beatBloom, chromaSlice.",
  "output": "{\"moduleId\":\"spectralGrid\",\"parameterHints\":{\"density\":1.4},\"reason\":\"Matches prior accepted data storm cases.\"}"
}
```

Do not fine-tune on messy raw logs. Fine-tune only on cleaned, validated, high-signal examples.

---

## Best build order

1. Structured feedback row schema.
2. Accept/reject feedback UI with tags.
3. JSONL export/import.
4. Memory scoring.
5. Keyword memory search.
6. Distilled memory summaries.
7. Feed retrieved memories into SLM prompts.
8. IndexedDB migration.
9. Embedding search.
10. Training dataset cleaner.
11. Optional fine-tuning pipeline.

This gives GEF a growing memory without letting the memory pile become a junk drawer with a keyboard.
