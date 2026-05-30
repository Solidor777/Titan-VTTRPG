# v14 Context & Migration Repair — Design

**Date:** 2026-05-30
**Status:** Approved design (pre-plan)

## Problem

Since the v14 / pure-Svelte-5 migration (TyphonJS removed), **no TITAN sheet or
dialog has rendered end-to-end**. Each fix exposes the next break further down the
render path, which strongly implies the migration was never exercised in a browser.
The breaks fall into two buckets:

1. **Foundry-version API conventions** the migration never adopted (how v14
   constructs sheets, the v14 ActiveEffect schema verifier).
2. **TyphonJS runtime conventions** left in place with nothing providing them — the
   `#external` Svelte context that backed `getApplication()`.

There is also no automated way to verify the Svelte wiring, so every regression has
been found by manual click-and-paste against a running Foundry.

## Goals

- Make all document sheets, dialogs, and chat cards render correctly under Foundry
  v14 with pure Svelte 5.
- Replace the broken TyphonJS context conventions with idiomatic pure-Svelte-5
  equivalents.
- Stand up a three-tier test strategy so these breaks are caught automatically and
  cannot silently regress.

## Non-goals

- The original effect check-rolling feature (sheet rows + chat) — resumes after this
  repair unblocks it (tracked separately; see backlog).
- Deep check-result-accuracy test coverage — the Quench tier is scaffolded now, but
  exhaustive result-correctness suites are future work.

## Completed prerequisites (already applied this session)

These were applied while diagnosing and are folded in here so the plan can add
regression tests for them:

1. **Sheet constructor calling convention.** Foundry v14 constructs every
   `DocumentSheetV2` as `new cls({ document })` (a single options object), but TITAN
   sheets used the positional `(sheetDocument, options)` signature, double-wrapping
   the document. Added `src/helpers/utility-functions/ResolveDocumentSheetArguments.js`
   (normalizes both forms) and applied it in `TitanDocumentSheet`, `TitanActorSheet`,
   `TitanItemSheet`, and `TitanActiveEffectSheet` (the latter two now read
   `this.document` for their `this.item` / `this.effect` aliases).
2. **Deep-merge crash.** `TitanDocumentSheet` no longer `mergeObject`s the document
   into the options (which recursed into read-only `items`/`effects` collections); it
   assigns `resolvedOptions.document = resolvedDocument` directly.
3. **ActiveEffect `changes` schema.** `TitanActiveEffectDataModel.changes` is now an
   `ArrayField` of `SchemaField` (key/value/mode/priority/type/phase) to satisfy the
   v14 `#verifyActiveEffectModels` verifier, keeping a permissive shape.

## Root cause — the remaining context break

`src/helpers/utility-functions/GetApplication.js` resolves the owning application via
`getContext('#external').application`. `#external` was a **TyphonJS** convention; in
the pure-Svelte-5 stack nothing provides it, so every component that calls
`getApplication()` throws the instant it renders.

Scope is exact: one context key (`#external` → `{ application }`), consumed by
`getApplication()` in 18 components across **two** surfaces:

- **Sheets** (mounted by `TitanDocumentSheet`): `ImagePicker`, actor-sheet token
  buttons.
- **Dialogs** (mounted by `Dialog.js`): all check dialogs, trait dialogs,
  confirmation, edit-UUID, add-inventory-item, etc.
- **Chat is not affected** — no chat component calls `getApplication()`, and chat
  messages have no backing Application.

The build is clean: **no `@typhonjs` / `#runtime` imports remain**, so this context
convention is the only TyphonJS *runtime* leftover.

### `document` / `applicationState` context — verified sound

- Sheets: `DocumentSheetShell` sets `document` + `applicationState`.
- Chat: `ChatMessageShell` sets `document`.
- Dialogs: do **not** consume `getContext('document')` (they read data via
  `getApplication()` → the dialog app), so they need no `document` context.

Once `getApplication()` is fixed, the `document` bridge is structurally complete; the
tests confirm it reacts at runtime.

## Design

### Context key conventions (target state)

| Context key        | Provided by                                  | Consumed by                          |
|--------------------|----------------------------------------------|--------------------------------------|
| `application`      | mount `context` Map at sheet + dialog mounts | `getApplication()` consumers         |
| `document`         | `DocumentSheetShell`, `ChatMessageShell`     | sheet + chat descendants             |
| `applicationState` | `DocumentSheetShell`                         | sheet descendants                    |

### Phase 0 — Test infrastructure (TDD foundation)

Stand up all three tiers up front; write the first failing test before fixing.

- **Tier 1 — Vitest unit/wiring harness (mocked Foundry).**
  - Add Vitest + `happy-dom`, wired through the existing `@sveltejs/vite-plugin-svelte`.
    New `test` script.
  - A minimal **Foundry-globals mock** (`foundry.utils.mergeObject`,
    `foundry.abstract.Document`, etc.) and a **fake `ReactiveDocument`**.
  - **First failing test (red):** mount `DocumentSheetShell` with a descendant that
    calls `getApplication()`; assert it resolves the owning application — fails today
    (proves the `#external` break).
  - **Regression tests for the applied prerequisites:** construct each sheet class
    both ways (`new Sheet(doc)` and `new Sheet({ document: doc })`) and assert
    `this.document` / `this.item` / `this.effect` / `this.actor` resolve to the real
    document; assert the options path does not deep-merge the document.
- **Tier 2 — Playwright render-smoke E2E (real Foundry).**
  - Playwright config + an auth helper that logs into the **already-running** local
    Foundry (`localhost:30000`) with credentials provided at implementation time.
  - A render-smoke spec scaffold: for each document type, render its sheet via
    `page.evaluate(() => doc.sheet.render(true))`, collect `page.on('pageerror')` /
    console errors, assert the sheet element is present and zero uncaught errors.
- **Tier 3 — Quench in-client groundwork (real Foundry, deep assertions).**
  - Conditionally register Quench test batches on the `quenchReady` hook (dev-only,
    no-op when Quench absent).
  - A starter batch: render a sheet in-client and assert no throw; a placeholder
    check-roll batch establishing the pattern (stub RNG → `requestItemCheck` →
    inspect `ChatMessage.flags.titan`) as the reserved home for future
    check-result-accuracy tests.

### Phase 1 — Context repair (make Tier 1 green)

- Rewrite `GetApplication.js` to `getContext('application')`.
- Provide `application` context at the two Application-backed mounts:
  - `TitanDocumentSheet._replaceHTML`: `mount(DocumentSheetShell, { target, props,
    context: new Map([['application', this]]) })`.
  - `Dialog.js._replaceHTML`: same, with the dialog app as `application`.
  - `OnRenderChatMessageHTML`: unchanged.
- Add a `ReactiveDocument` reactivity test (update the bridge → component re-renders).

### Phase 2 — Static v14 break audit

Via the `titan-svelte-dev` subagent, cross-referencing the `foundry-versioning` skill,
sweep `src/` for v13→v14 deltas and produce a concrete break list:

- `FilePicker` / `TextEditor.enrichHTML` / ProseMirror API shape.
- `foundry.appv1` remnants and deprecated `Application` options.
- Changed hook names/signatures.
- Direct `foundry.utils.mergeObject` misuse (e.g. merging documents).
- Document-subtype and sheet-registration APIs.

### Phase 3 — Runtime walk (automated via Playwright)

Rebuild, then run the Playwright render-smoke suite across every surface — player
sheet, NPC sheet, all 7 item sheets, the effect sheet, each dialog, each chat-card
type — fixing whatever throws and iterating to a clean pass. Playwright replaces the
manual click-and-paste loop.

## Testing philosophy

- **Vitest (mocked):** fast regression net for pure helpers + Svelte context/reactivity
  wiring. Catches wiring regressions; cannot discover Foundry-version breaks.
- **Playwright (real Foundry, outside-in):** discovers and guards against
  version-specific render breaks; automates the runtime walk.
- **Quench (real Foundry, in-process):** the home for check-result accuracy and
  deep logic assertions (groundwork now, depth later).

## Risks

- **Playwright auth flow** is the brittlest piece (version-sensitive selectors);
  mitigated by assuming an already-running world and using API calls (`doc.sheet.render`)
  rather than UI navigation for the assertions.
- **Mock drift** — the Vitest Foundry mock reflects our understanding, not the real
  install; Playwright/Quench cover what mocks cannot.
- **Quench** requires the Quench module installed in the dev world; batches are gated
  so production is unaffected.

## Skill update

Record in `titan-codebase`: the context-key conventions table above, the v14
sheet-constructor calling convention, and the v14 ActiveEffect `changes` schema
requirement.
