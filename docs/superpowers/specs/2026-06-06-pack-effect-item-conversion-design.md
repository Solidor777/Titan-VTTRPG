# Pack effect-Item conversion + invalid-document repair — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorm 2026-06-06)
**Closes:** `docs/TODO.md` #6 (convert effect Items inside compendium-packed actors) and `docs/OPEN_BUGS.md` #8
(world converter blind to invalid legacy effect Items).
**Predecessor:** `specs/2026-05-30-titan-active-effects-conversion-design.md` (shipped; section 5 deferred packs).

---

## 1. Problem & root cause

Two defects, one mechanism:

- **World converter blind spot (latent bug, OPEN_BUGS #8):** `convertActor`
  (`src/helpers/migration/ConvertEffectItemsToActiveEffects.js`) discovers legacy items via
  `actor.items.filter((item) => item.type === 'effect')`. Commit `33697e2f` removed the `effect` Item subtype from
  `system.json` `documentTypes.Item`, so legacy effect Items now fail strict document construction
  (`DocumentTypeField._validateType` throws on an unregistered type — verified in
  `C:\FoundryVTT\V14\foundry\common\data\fields.mjs`) and land in `EmbeddedCollection#invalidDocumentIds`
  (`common/abstract/embedded-collection.mjs` `_initializeDocument` → `_handleInvalidDocument`). Invalid documents are
  excluded from `actor.items` iteration, so on any world whose FIRST load on a post-removal build still contains
  legacy effect Items, the converter silently no-ops and the items are stranded as invalid documents (not lost —
  still present in `_source` / the database). Dev worlds converted correctly only because they ran interim builds
  while the subtype was still registered.
- **Packs never covered (TODO #6):** the converter skips compendium packs entirely (a known limitation called out in
  the predecessor spec), and packed actors' legacy effect Items present as invalid embedded documents for the same
  reason.

**Root-cause fix:** legacy-item discovery moves to **raw source** — `actor._source.items.filter((i) => i.type ===
'effect')` — which sees valid and invalid items alike, uniformly across world actors, unlinked token actors, and
packed actors. No special-casing of the invalid-document bucket.

## 2. Decisions (brainstorm outcomes)

| Decision | Choice |
| --- | --- |
| Scope | Fold the world-converter invalid-document repair into this spec alongside the pack extension |
| Pack coverage | **World Actor packs only** (`metadata.type === 'Actor' && metadata.packageType === 'world'`); module/system packs, Adventure packs, and Scene packs (unlinked-token deltas) stay out of scope |
| Trigger | **Every load, index-gated**: runs with the existing every-load converter; a raw index projection decides per pack whether any document load happens at all |
| Lock policy | **Auto-unlock, restore state**: a locked pack with legacy items is unlocked via `pack.configure({ locked: false })`, converted, and restored in a `finally` block |

## 3. Changes to the existing converter (world path)

All in `src/helpers/migration/ConvertEffectItemsToActiveEffects.js`:

- `buildEffectData(item)` → accepts a **raw item source object** (plain `{ name, img, system: {…} }`) instead of a
  `TitanItem`. Every field it reads (`system.duration?.type`, `system.active`, `system.description`, deep-cloned
  `rulesElement` / `duration` / `check` / `customTrait`, plus `name` / `img`) exists identically on raw source.
- `convertActor(actor)` → discovers legacy items from `actor._source.items`; collects ids from the same raw entries.
  `createEmbeddedDocuments('ActiveEffect', …)` and `deleteEmbeddedDocuments('Item', ids)` are unchanged — embedded
  deletion by id operates at the source level and works on invalid documents (the same path Foundry's own
  invalid-document recovery uses). The stale-mirror cleanup (`actor.effects`, valid base-subtype AEs) is untouched.
- Non-destructive ordering preserved: create replacement AEs → delete source items → delete stale mirrors.
- JSDoc updated: the module-level "Compendium-packed actors are NOT converted by this routine" limitation is removed;
  `buildEffectData`'s parameter contract documents the raw-source shape.

## 4. New pack path (world Actor packs, index-gated, every load)

Appended to the same module and called from the existing `OnceReady` wiring (after the world-actor and
unlinked-token loops, inside the same GM-only guard):

```text
for each pack in game.packs
      where pack.metadata.type === 'Actor' && pack.metadata.packageType === 'world':
   index = await pack.getIndex({ fields: ['items'] })        // raw source projection — no document construction
   needy = index entries where entry.items?.some((i) => i.type === 'effect')
   if needy is empty → continue                              // steady-state cost ≈ one index scan per pack
   wasLocked = pack.locked
   try:
      if wasLocked → await pack.configure({ locked: false })
      for each needy entry:
         actor = await pack.getDocument(entry._id)
         await convertActorIsolated(actor)                   // reuses the existing per-actor isolation
   finally:
      if wasLocked → await pack.configure({ locked: true })  // restore original lock state
```

- **Per-actor isolation:** reuses `convertActorIsolated` (one bad actor logs and continues).
- **Per-pack isolation:** each pack's scan/convert is wrapped so one bad pack logs and continues; the `finally`
  guarantees lock restoration even when conversion throws.
- **Idempotent forever:** later imports / backup restores into world packs are picked up on the next load; no
  completion flag, no manual tool.

## 5. Error handling & observability

- Keep the existing `log()` / `error()` pattern: the existing start/finish lines, plus one line per converted pack
  (pack label + converted-actor count). Clean packs stay silent.
- A failed lock-restore logs an error naming the pack. Worst case is a pack left unlocked — never data loss.
- `docs/OPEN_BUGS.md` #8 (the world-converter blind spot) is logged with this spec and deleted by the implementation
  that ships this design (hygiene rule: completed entries are deleted).

## 6. Testing

- **Unit:**
  - `buildEffectData` against raw source fixtures — active/inactive permanent effects, duration variants — extending
    the existing coverage to the raw-source contract.
  - Discovery against `_source`-shaped fixtures that include unregistered-type (`effect`) entries.
  - Pack-iteration gate logic against a faked pack object: index with/without legacy items (gate skips clean packs),
    locked/unlocked (asserts the `configure(unlock) → convert → configure(re-lock)` call order and the
    `finally`-path restore on a thrown conversion).
- **E2E (shallow by necessity):** seeding an unregistered-subtype item at runtime is impossible by design —
  server-side strict validation rejects creation. E2E therefore covers the safe plumbing: create a world Actor pack
  with a clean actor at runtime → reload-boot path runs the converter → no-op, lock state intact, no console errors.
- **Manual (deep path):** run against a copy of a real pre-conversion world containing a packed actor with legacy
  effect Items — confirm the items become equivalent `effect` AEs with no leftovers, matching the predecessor spec's
  section 6.7 verification mode.

## 7. Documentation upkeep

- Delete `docs/TODO.md` #6 and `docs/OPEN_BUGS.md` #8 when this ships.
- Update the `titan-codebase` skill where it describes the converter's scope (migration data-flow notes).
