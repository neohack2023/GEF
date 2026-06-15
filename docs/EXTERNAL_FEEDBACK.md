# External Feedback Notes

Early outside feedback should be treated as evidence, not authority. This document captures useful product signals from pre-public conversations so they can inform the roadmap without bypassing the project safety model.

## Source context

- Source type: private Reddit conversation with a shader-tooling creator.
- Project state: GEF is not publicly released yet.
- Conversation topic: browser-based generative visuals, audio reactivity, sandbox-first module/shader experimentation, and future shader/provider tooling.
- Privacy note: do not store personal identifiers from informal outreach unless permission is given.

## Feedback captured

The outside reader understood GEF as a personal project rather than a commercial product. They saw potential in the concept and identified one natural application: large screens behind a DJ in a club. Their read was that sound visualization can add another sense of depth to the music, especially when the visual layer is connected to the audio rather than acting as decoration.

They also noted limited availability but left the door open for brief shader-related feedback.

## Product signal

This feedback validates a useful application lane:

**GEF can serve as a live audio-reactive visual lab for DJ screens, projection walls, music backdrops, streaming visuals, and VJ-style performance setups.**

That does not mean GEF should become a commercial VJ product immediately. It means the current architecture should preserve the option to support that lane later.

## Positioning lesson

The outreach worked because it described GEF as a controlled creative system instead of a generic visualizer.

Strong points to keep:

- Browser-based generative visual engine.
- Audio-reactive visuals driven by usable metrics, not raw volume alone.
- Modular render runtime.
- Stable main lane plus sandbox preview lane.
- Manual promotion from experiment to stable runtime.
- AI/SLM/provider output treated as suggestions, not authority.
- Human review remains the final gate.

Weak points to avoid:

- Overselling the app as finished.
- Calling it production-ready before performance and failure modes are tested.
- Treating shader/provider integration as safe just because it is visually exciting.
- Letting the DJ/projection use case override sandbox, validation, and panic-reset priorities.

## Live visuals use-case requirements

If GEF grows toward DJ screens or performance visuals, the feature checklist should include:

| Area | Requirement |
| --- | --- |
| Stability | Main renderer must remain recoverable even when sandbox visuals fail. |
| Panic controls | Panic reset must be obvious, fast, and safe during live playback. |
| Performance | Visual modules need frame-budget awareness and graceful degradation. |
| Presets | Users need reliable save/load for stage-ready looks. |
| Audio input | Live input and media input should both be supported with clear permission handling. |
| Metrics | Bass, mid, treble, RMS, centroid, beat, and glitch pressure should remain inspectable. |
| Display | Fullscreen / projection output should avoid UI clutter. |
| Safety | Imported presets, datasets, memory, and provider output must never execute directly. |
| Recovery | Failed modules should produce diagnostics and fallback visuals instead of blank screens. |

## Shader-tooling questions for outside experts

Use these when asking shader creators or VJ-tool builders for brief feedback:

1. What makes a shader-authoring workflow feel fast without becoming fragile?
2. Should first-pass shader editing be text-first, parameter-first, node-first, or preset-first?
3. What validation catches the most common GLSL/WGSL mistakes before runtime?
4. How should parameter bounds be exposed so visuals stay expressive but controllable?
5. What failure states are common in live shader tools?
6. What diagnostics would help a creator fix a broken visual quickly?
7. How should audio metrics map into shader uniforms without creating jitter soup?
8. What should never be allowed during a live performance path?

## Design implications for GEF

- Keep Canvas2D as the stable baseline until shader adapters have a validator and fallback plan.
- Treat WebGL/GLSL and WebGPU/WGSL as adapters, not replacements for the safe renderer.
- Keep the main visual lane and sandbox preview lane separate.
- Require manual promotion for any experimental visual path.
- Keep telemetry local and useful for review, not noisy surveillance confetti.
- Prefer bounded parameters over free-form generated behavior.
- Use curated modules as reliable stage pieces before allowing generated shader-style modules.

## Candidate demo presets

These are not roadmap promises. They are useful demo targets for testing the live-visual lane.

| Preset | Purpose | Metrics to emphasize |
| --- | --- | --- |
| DJ Wall: Pulse Field | Stable performance backdrop with beat accents. | RMS, beat, bass |
| Club Grid: Audio-Bent Lines | Shows clear music-linked geometry without overloading the screen. | bass, mid, centroid |
| Glitch Bloom: Controlled Impact | Uses beat-triggered bloom and glitch pressure for drops. | beat, glitch, treble |
| Projection Fog: Slow Depth | Slower ambient visual for intros, breaks, and low-energy sections. | RMS, centroid, mid |
| Sandbox Compare: A/B Visual | Demonstrates stable lane versus experimental lane. | all inspectable metrics |

## Outreach pattern

A strong outreach message should be short, specific, and respectful of the other builder's time.

Recommended structure:

1. Name the specific thing you noticed in their work.
2. Describe GEF in one paragraph.
3. Mention the safety model in one sentence.
4. Ask one narrow question, not for a full review.

Example ask:

> I am hardening the sandbox and future shader-adapter path right now. From your experience, what is the first validation layer you would add before letting shader-style experiments into a live preview?

## Maxims

- Models may suggest. Validators decide. Users promote.
- If it can run behind a DJ, it must fail gracefully.
- A beat trigger is not permission to strobe the room into a toaster.
- Depth comes from metric intent, not volume tantrums.
- The live lane needs a panic button before it needs pyrotechnics.
