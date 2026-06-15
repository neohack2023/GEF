# Telemetry Quarantine Review

GEF treats imported telemetry as untrusted until a user reviews it.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

The quarantine review flow keeps imported JSONL from silently becoming exportable training material.

---

## Current behavior

When a JSONL file is imported through the Library tab, each imported row receives `_gefImport` metadata.

Important fields:

| Field | Meaning |
| --- | --- |
| `state` | Starts as `quarantined`. |
| `fileName` | Source file name from the import. |
| `lineNumber` | Original JSONL line number. |
| `schemaStatus` | Starts as `unvalidated`. |
| `reviewed` | Starts as `false`. |

Imported rows are visible in the Library tab under **Import Quarantine**.

---

## Review actions

### Promote Quarantined

Marks all currently quarantined rows as reviewed local imports.

The row metadata changes to:

```text
state: promoted
schemaStatus: accepted-for-local-review
reviewed: true
reviewedAt: <timestamp>
```

Use this only when the imported rows look useful and belong in the reviewed local dataset.

### Delete Quarantined

Deletes all currently quarantined rows from local telemetry storage.

Use this when imported rows are stale, noisy, malformed, untrusted, private, or simply not useful.

Project maxim:

```text
Deletion beats retention.
```

---

## Export behavior

The Library export button now exports reviewed rows only.

Export includes:

- local rows created by normal GEF usage
- promoted imported rows

Export excludes:

- quarantined imported rows
- rejected imported rows, if a future workflow adds rejected state tracking

If the dataset only contains quarantined rows, export is blocked and the status bar tells the user to promote or delete the rows first.

---

## What this does not do yet

- It does not validate rows against `gef-feedback-row-v1`.
- It does not review rows one by one.
- It does not create training, eval, or holdout splits.
- It does not make imported rows training-ready.
- It does not call any provider.

This is a local review gate, not a dataset certification system.

---

## Next upgrades

Recommended next steps:

1. Add per-row approve/delete controls.
2. Add schema validation for `gef-feedback-row-v1`.
3. Add privacy-state checks before export.
4. Add a dataset-card generator for reviewed exports.
5. Add unit tests for quarantine promotion, deletion, and export filtering.

---

## Maxim

```text
Imported data waits at the velvet rope until the user says it belongs in the room.
```
