# TITAN E2E — Phase 3d: Reactive-Control Sweep (Design)

**Date:** 2026-05-31. **Branch:** `development`. **Status:** approved design, pre-plan.
**Prereqs:** Phase 3a + all of Phase 3b complete (276 e2e green, 35 unit green). This spec covers
**Phase 3d**; Phase 3c (integration manifests) is deferred to a later session by user decision.

## 1. Problem

The Svelte 4→5 migration left a systemic reactivity bug class in the sheet UI. Svelte 5 fine-grained
reactivity only tracks reads that go **through the reactive `document.data` store**. A component that
reads `<prop>.system.x` off a *passed Document (or sub-document) prop* has **no reactive dependency** on
that value, so when the value changes the control does **not** re-render — it stays stale until the row or
tab re-mounts. This was first confirmed and fixed as **bug #8** (`CharacterSheetEffectToggleActiveButton`,
commit `a960e135`, regression `tests/e2e/effect-reactivity.spec.js`):

```js
// BEFORE (stale): reads off the passed `effect` prop — no reactive dependency.
active={effect.system.isActive}

// AFTER (reactive): re-reads through the document.data store — tracked, re-renders in place.
const isActive = $derived(document.data.effects.get(effect.id)?.system.isActive ?? false);
```

The antipattern is concentrated in **list-row components** — components iterated out of a
`document.data.<collection>` and handed a per-entry Document/sub-document prop (`effect`, `item`, `trait`,
`attack`, `aspect`, `skill`, …) which they then read `.system.x` off directly. `CharacterSheetEffect.svelte`
alone shows several at-risk reads (`effect.system.duration.*`, `effect.system.isExpired`,
`effect.system.customTrait`).

## 2. Goal & non-goals

**Goal:** Eliminate this bug class across the sheet UI — find every at-risk control, prove the stale bug
behaviorally, and fix it by re-reading through `document.data`.

**Non-goals:**
- Phase 3c (manifest-wiring assertions) — deferred.
- Chat-message / report components — they are render-once snapshots of a completed roll, not live-editable
  sheet rows; out of scope unless the audit finds a genuinely live-editable one.
- A blind mechanical rewrite of every `prop.system.x` read. The fix bar is **behavioral red-first only**
  (§5): we fix a read only when a test proves it goes stale in place. Render-once reads are not bugs and
  are left untouched (recorded as such).

## 3. Two-stage structure

### Stage A — Static audit (read-only → committed worklist)

A subagent fan-out scans every sheet list-row component **and its descendants** for the antipattern. The
detection signature:

- The component receives a per-entry Document or sub-document via `$props()` (e.g. `effect`, `item`,
  `trait`, `attack`, `aspect`, `skill`), sourced by iterating a `document.data.<collection>`.
- It reads `<prop>.system.x` (or `<prop>.x`) in a **reactive position** (markup, `$derived`, a rendered
  snippet) rather than via `document.data.<collection>.get(<prop>.id)?.system.x`.

**Distinguish (critical):**
- **At-risk** = *displays* a doc value read off the prop (one-way render).
- **Not the bug** = a `$bindable` prop bound for two-way local UI state, or a value read only inside an
  event handler / `onclick` (handlers run at click time, not as a tracked render dependency).

**Output:** a committed worklist doc, `docs/superpowers/specs/2026-05-31-titan-e2e-3d-reactive-sweep-worklist.md`,
a table grouped by family (effect rows · inventory/ability/spell/weapon-attack/skill rows · sidebar ·
header) with columns:

| file | prop | read expression | owning collection | can-change-in-place? (hypothesis) | drivable via |

This is the **candidate** list, not the fix list.

### Stage B — TDD each candidate, red-first

Per candidate, in the ordering of §6:

1. **Write the behavioral test first; watch it go RED.** Pattern (from bug #8): render the owning sheet,
   locate the row **without switching tabs**, mutate the underlying value through a real in-place path (the
   control itself, or the `document.update` / system mutator the control calls), then assert the **rendered**
   control reflects the new value **in place** — no tab switch, no re-mount. Red proves a genuine stale bug.
2. **If it can't be driven red** — the value can't change while the row stays mounted, or only a
   re-mounting flow changes it — it is **not a bug**. Record it in the worklist as `not-a-bug / render-once`,
   leave the code untouched, move on.
3. **Fix → green.** Re-read through the store:
   `$derived(document.data.<collection>.get(<prop>.id)?.system.x)`. `npm run build:e2e`, confirm green.
4. **Commit** per control (or per tight cluster), referencing the worklist row.

## 4. Triage criterion (what makes a candidate a real bug)

A read is a bug **iff the displayed value can change while the row stays mounted**. Values set at creation
and only changed by a flow that already forces a full re-mount are **not** bugs. The audit records a
hypothesis; Stage B's red test is the proof. This criterion is what prevents speculative churn.

## 5. Fix bar — behavioral red-first only

Chosen explicitly: **only fix a control when a behavioral test goes red first.** If a read cannot be driven
to go stale in place, it is not a bug — leave it, note it. Smallest fully-proven diff; matches "TDD each."

## 6. Ordering

1. **item/effect `expanded` toggle** (explicitly named next item). First verify whether expansion is a
   Document-prop read or a local `$bindable` (`CharacterSheetItem` takes `bind:isExpanded`) before assuming
   it is this antipattern — it may be local UI state and therefore not a bug.
2. **Effect rows** — `CharacterSheetEffect.svelte` and descendants (dense with at-risk reads).
3. **Inventory / ability / spell / weapon-attack / skill rows** — the remaining iterated row families.
4. **Sidebar / header controls** the audit flags.

## 7. Conventions (carried from prior phases — not re-derived)

- Login `E2E GM 1` (never the human `Gamemaster` session); stay on `development`; no git worktree (live
  Foundry on :30000 serves this directory).
- In-place asserts **stay within the active tab** — `Tabs.svelte` lazy-mounts only the active tab, so a
  cross-tab change always re-mounts and would mask the bug.
- All `.svelte` / `.js` / `.svelte.js` work routed through the **`titan-svelte-dev`** subagent (loads
  `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`); follow `.claude/CLAUDE.md` style. The
  read-only audit may use an `Explore` / general agent.
- `npm run build:e2e` after any `src/` edit before probe/e2e runs (test-only changes need no build).
- Reuse: `forceDice`/`resetDice` (`tests/e2e/dice.js`), shared builders (`tests/shared/builders.js`), and
  the bug-#8 reactivity test (`tests/e2e/effect-reactivity.spec.js`) as the template.

## 8. Verification / definition of done

- `npx vitest run` → 35 still green (no unit impact expected).
- `npm run build:e2e` then `npx playwright test --reporter=list` → 276 prior + N new reactive tests, all
  green.
- Worklist fully triaged: **every** candidate is either *fixed + tested-green* or *marked not-a-bug with a
  reason*. No candidate left undecided.
- On completion: update `docs/superpowers/e2e-suite-status.md`, the `titan-codebase` conventions, and the
  resume memory; log any bugs found in the status doc's bug log.

## 9. Risks / watch-items

- **False positives** — many `prop.system.x` reads are render-once. The red-first bar filters these out; no
  speculative fixes.
- **Drive-path subtlety** — some values are only mutable by a sibling control on the same row; the test must
  use a real in-place mutation path, not a re-render trigger.
- **`$bindable` props** — two-way bound local UI state behaves differently from a one-way display read; the
  audit must not misclassify a `bind:` as the bug.
- **Event-handler reads** — `onclick={() => ...prop.system.x}` runs at click time, not as a render
  dependency, so it is not this bug; the audit must exclude handler-only reads.
