# Row-Input Reactivity (Effect Duration + Commodity Quantity) — Design

**Date:** 2026-06-01. **Status:** approved, ready for implementation plan.
**Origin:** Phase 3d / Phase 4 open follow-up #2 (see `docs/superpowers/e2e-suite-status.md`, the
"Deferred" blocks and bug #15). Carried over from the Phase 3d reactive-control sweep.

## Problem

Character-sheet **list rows** render a child document (an embedded `ActiveEffect` or `Item`) passed
in as a prop. Bug #15 fixed the rows' **display** reads by routing them through the reactive
`document.data` bridge (e.g. `$derived(document.data.effects.get(effect.id)?.system.duration.remaining)`).
But the rows' numeric **inputs** were left bound two-way directly to the passed prop:

```svelte
<!-- CharacterSheetEffect.svelte -->
<IntegerIncrementInput min={0} bind:value={effect.system.duration.remaining} onchange={…} />
```

`effect`/`item` is a passed Document prop, not the `document.data` bridge, so the read has no reactive
dependency: when the underlying document is mutated in place (a combat turn decrements the duration, a
second client edits it), the input field stays **stale until the row re-mounts**. The Phase-3d display
recipe cannot be applied here because you **cannot `bind:` to a `$derived`** (it is read-only) — which is
exactly why this was deferred to its own spec.

Scope of the bug is small and exact. Splitting all `bind:value={…system.…}` call sites by what they bind
to:
- **Class A — bound to `document.data.system.*`** (a document's *own* sheet, via the reactive bridge):
  already reactive, not buggy. This is the large majority (sheet headers, attributes, rules-element
  settings, and the effect **sheet** header's duration inputs in `ActiveEffectSheetHeader.svelte`).
- **Class B — bound to a passed child-document prop `<doc>.system.*`** (list rows): the bug. Exactly
  **three** call sites:
  1. `CharacterSheetEffect.svelte` — `effect.system.duration.remaining` (`IntegerIncrementInput`).
  2. `CharacterSheetEffect.svelte` — `effect.system.duration.initiative` (`IntegerInput`, shown only for
     `initiative`-type durations).
  3. `CharacterSheetCommodity.svelte` — `item.system.quantity` (`IntegerIncrementInput`).

### Latent secondary bug (fixed as a side effect)

The +/- buttons on `IntegerIncrementInput` mutate `value` (`value += increment`) but never fire
`onchange`; only `NumberInput`'s keyup/native-change path calls `onchange`. In the current row code the
commit happens *in* `onchange`, so clicking +/- mutates the passed prop in memory (and the display may
update via the bindable) but **never persists** to the document. The fix below commits on every value
write, so increments persist too.

## Design

Convert the three Class-B bindings to **Svelte 5 function bindings** (`bind:value={get, set}`, available
since 5.9.0; the project runs Svelte 5.55.10). No change to the shared primitives
(`NumberInput`/`IntegerInput`/`IntegerIncrementInput`) or the Document wrappers.

```svelte
bind:value={
   () => document.data.<collection>.get(<doc>.<idField>)?.system.<leaf> ?? <fallback>,
   (newValue) => <doc>.update({ system: { <leaf>: newValue } }),
}
```

- **Getter** reads through the `document.data` bridge, so it carries a reactive dependency on the live
  collection entry — external / turn-driven in-place updates re-render the input. The chain
  `IntegerIncrementInput → IntegerInput → NumberInput` forwards the binding via `$bindable` +
  `bind:value` shorthand throughout, so reads call the getter at every level.
- **Setter** commits via the child document's own `update()` (the actor-scoped `refreshSystemDocument`
  used by the `Document*Input` wrappers does not apply to a child row's document). It runs on every value
  write: `NumberInput.parseInput` (typing, on keyup) **and** the +/- buttons' `value += …` (which now
  read-then-write through the binding). This replaces the inline `onchange` handlers.
- **`?? <fallback>` (0)** guards the transient where the child document is mid-deletion: the derived
  returns `undefined`, which would otherwise throw at `value.toString()` in `NumberInput`.

### Exact edits

**1. `CharacterSheetEffect.svelte`** — uses `effect.id` (matching the file's existing derived reads).

- `remaining` (`IntegerIncrementInput`, currently lines ~91–103): replace `bind:value` + `onchange` with
  ```svelte
  bind:value={
     () => document.data.effects.get(effect.id)?.system.duration.remaining ?? 0,
     (newValue) => effect.update({ system: { duration: { remaining: newValue } } }),
  }
  ```
- `initiative` (`IntegerInput`, currently lines ~64–77): replace `bind:value` + `onchange` with
  ```svelte
  bind:value={
     () => document.data.effects.get(effect.id)?.system.duration.initiative ?? 0,
     (newValue) => effect.update({ system: { duration: { initiative: newValue } } }),
  }
  ```
  Keep the existing `min={0}` prop.

**2. `CharacterSheetCommodity.svelte`** — uses `item._id` (matching the file's existing derived reads).

- `quantity` (`IntegerIncrementInput`, currently lines ~56–65): replace `bind:value` + `onchange` with
  ```svelte
  bind:value={
     () => document.data.items.get(item._id)?.system.quantity ?? 0,
     (newValue) => item.update({ system: { quantity: newValue } }),
  }
  ```

No other props change. The `onchange={() => …update(…)}` handlers are deleted (the setter supersedes
them).

## Testing (e2e)

Extend the existing reactive specs (reuse their seeding `beforeEach`), do not add parallel files. The
duration / quantity inputs live in the row's `controls` snippet (the row header), so they are visible
without expanding.

**`tests/e2e/reactive-effect-rows.spec.js`** (seeds a player actor + one `turnStart` effect, remaining 1):
- **Input reactivity [red→green]:** read the `remaining` input's displayed value; `effect.update` it to a
  new value in `page.evaluate`; assert the input field reflects the new value **in place** (no tab switch,
  no re-expand).
- **+/- commit [red→green, latent-bug lock]:** click the increment button; assert
  `effect.system.duration.remaining` persisted to the new value (re-read via `page.evaluate`).
- **Typing commit [regression lock]:** type a new value into the input; assert it persisted. (Passes on
  current code; locks the behavior.)
- **Initiative input:** seed (or reconfigure) an `initiative`-duration effect so the `initiative`
  `IntegerInput` renders; assert reactivity (external `effect.update`) + commit (typing).

**`tests/e2e/reactive-inventory-basic.spec.js`** (seeds a player actor + one commodity):
- **Quantity reactivity [red→green]:** external `item.update` of `quantity` → input updates in place.
- **Quantity +/- commit [red→green]** and **typing commit [regression lock]** as above, asserting
  `item.system.quantity` persisted.

TDD order per case: write the test, run it red against current code (reactivity + increment-commit
fail; typing-commit passes as a lock), apply the function-binding edit, run green.

## Files

- **Edit:** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`
- **Edit:** `src/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte`
- **Test:** `tests/e2e/reactive-effect-rows.spec.js` (extend)
- **Test:** `tests/e2e/reactive-inventory-basic.spec.js` (extend)
- **Docs:** add the row-input function-binding recipe to
  `.claude/skills/titan-codebase/references/conventions.md` (extends the existing row display-read
  recipe — "for a row's two-way INPUT to a child-doc leaf, bind with a function binding whose getter reads
  through `document.data.<coll>.get(id)?.…` and whose setter calls `<childDoc>.update(...)`; never
  `bind:value={<prop>.system.…}`"); mark follow-up #2 done in `docs/superpowers/e2e-suite-status.md`.

## Build & verify

`npm run build:e2e`, then `npx vitest run` (expect 39, unchanged) and `npx playwright test`
(expect 312 + the new reactive cases).

## Working agreements

- Route all `.svelte` work through the `titan-svelte-dev` subagent (loads
  `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`). Follow `.claude/CLAUDE.md` style
  (120-col, multi-line conditional scopes, typed props with comments).
- Stay on `development`; rebuild with `npm run build:e2e` so the live Foundry serves the change AND keeps
  the gated component probe available. Build output is gitignored — never `git add` it.

## Rejected alternatives

- **Full primitive refactor** (one-way `value` + `oncommit` controlled-component model across
  `NumberInput`/`IntegerInput`/`IntegerIncrementInput` + the Document wrappers): the deferred note's
  original framing. Rejected — it cascades to ~40 `bind:value` call sites to fix a 3-site bug (YAGNI),
  with far higher regression risk. Function bindings achieve the same reactivity locally.
- **New child-bound input wrapper component** (collection + id + leaf-path get/set): adds an abstraction
  and string-path resolution machinery for only three call sites. The inline function binding is more
  explicit and DRY enough at this scale.
