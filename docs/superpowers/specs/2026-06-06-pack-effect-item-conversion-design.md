# Pack effect-Item conversion + invalid-document repair — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorm 2026-06-06); amended same day after a two-reviewer buddy check (13 agreed
findings folded in, 0 unresolved; user approved the provenance-flag idempotency delta).
**Closes:** `docs/TODO.md` #6 (convert effect Items inside compendium-packed actors), `docs/OPEN_BUGS.md` #8
(world converter blind to invalid legacy effect Items), and `docs/OPEN_BUGS.md` #9 (converter deleted all legacy
sources even if a third-party hook vetoed a creation — closed by the stamp-verified deletion delta).
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

- `buildEffectData(item)` → accepts a **raw item source object** (plain `{ _id, name, img, system: {…} }`) instead
  of a `TitanItem`. Every field it reads exists on raw source **but without schema casting** (raw reads bypass
  `BooleanField._cast` etc.): template-era source (verified at `2edf6262^:template.json`) persisted `active` as a
  STRING, and may lack `check` / `customTrait` entirely. Therefore `active` is normalized defensively
  (`?? true` default, string `'true'`/`'false'` cast mirroring `BooleanField._cast`, otherwise `Boolean(...)`);
  missing cloned fields flow as `undefined` and are filled by schema initials at creation. (Honest basis: the one
  verified template-era value, `"active": "true"`, converts outcome-identically either way and the era's toggle
  wrote booleans — the normalization is defense-in-depth for imported/hand-edited worlds, not a demonstrated
  misconversion.)
- **Provenance flag (idempotency, user-approved):** `buildEffectData` stamps each replacement AE with
  `flags.titan.convertedFromItem = itemSource._id`. (Distinct from the stale-mirror key `flags.titan.type`; the
  mirror filter excludes `effect`-subtype AEs regardless.)
- `convertActor(actor)` → discovers legacy items from `actor._source.items`; collects ids from the same raw entries.
  Before creating, it skips any source whose `_id` already has a surviving AE carrying `convertedFromItem` — making
  the create step **idempotent under retry** (a create-succeeded/delete-failed interruption, or two GM clients
  racing the same actor, no longer duplicates effects; the retry just finishes the deletion).
  Embedded deletion by id operates at the source level and works on invalid documents (the same path Foundry's own
  invalid-document recovery uses). The stale-mirror cleanup (`actor.effects`, valid base-subtype AEs) is untouched.
- **Stamp-verified deletion (user-approved 2026-06-06, closes OPEN_BUGS #9):** legacy sources are deleted only when
  their `_id` has a VERIFIED replacement — a pre-existing stamped AE (skip-guard survivors) or a stamp on a document
  actually RETURNED by `createEmbeddedDocuments` (a third-party `preCreateActiveEffect` veto removes its document
  from the returned array). Vetoed sources stay in `_source` — data preserved, retried next load — instead of being
  unconditionally deleted.
- Non-destructive ordering preserved: create replacement AEs (skipping already-converted) → delete stamp-verified
  source items → delete stale mirrors.
- JSDoc updated: the module-level "Compendium-packed actors are NOT converted by this routine" limitation is removed;
  `buildEffectData`'s parameter contract documents the raw-source shape, the casting caveat, and the provenance flag.

## 4. New pack path (world Actor packs, index-gated, every load)

Appended to the same module and called from the existing `OnceReady` wiring (after the world-actor and
unlinked-token loops, inside the same GM-only guard):

```text
for each pack in game.packs
      where pack.metadata.type === 'Actor' && pack.metadata.packageType === 'world':
   index = await pack.getIndex({ fields: ['items'] })        // summary projection — no document construction
   needy = index entries where entry.items?.some((i) => i.type === 'effect')
   if needy is empty → continue                              // steady-state cost ≈ one index scan per pack
   wasLocked = pack.locked
   try:
      if wasLocked → await pack.configure({ locked: false })
      for each needy entry (per-entry try/catch):
         actor = await pack.getDocument(entry._id)
         await convertActor(actor)
      log converted-of-flagged count for the pack
   finally:
      if wasLocked → try { await pack.configure({ locked: true }) }   // restore original lock state
                     catch → log a restore-specific error naming the pack
```

- **Index projection (corrected during buddy check):** `getIndex({ fields: ['items'] })` does NOT return raw item
  sources. The server projects each embedded item down to the Item `compendiumIndexFields` + `_id` —
  `{ _id, name, img, type, sort, folder }`, no `system` — with no validation, so invalid-typed (`effect`) entries
  ARE included and `type` IS readable, which is all the gate needs. Side effect: scanned packs retain these summary
  items arrays in the client index for the session, and the cached arrays go stale after conversion (a later
  same-session `getIndex({ fields: ['items'] })` serves the cache) — harmless to the converter, noted for future
  consumers.
- **Per-actor isolation (deliberate deviation from the earlier pseudocode's `convertActorIsolated` reuse):** the
  pack loop wraps `getDocument` + `convertActor` in its own per-entry try/catch with a pack-labeled error message —
  a superset of `convertActorIsolated` (which stays world-path-only) that also isolates document-load failures.
- **Per-pack isolation:** each pack's scan/convert is wrapped so one bad pack logs and continues; the `finally`
  guarantees a lock-restore attempt even when conversion throws, and a restore failure is caught inside the
  `finally` (logging a restore-specific error naming the pack) so it never masks an in-flight conversion error.
- **Idempotent forever:** later imports / backup restores into world packs are picked up on the next load; the
  `convertedFromItem` provenance guard (§3) makes the create step retry-safe; no completion flag, no manual tool.

## 5. Error handling & observability

- Keep the existing `log()` / `error()` pattern: the existing start/finish lines, plus one line per converted pack
  reporting the **actual successful count of the flagged total** (e.g. "Converted 2 of 3 flagged actor(s) …") so
  partial failures are not reported as full successes. Clean packs stay silent.
- A failed lock-restore logs a **restore-specific** error naming the pack (caught inside the `finally`, so it never
  masks an in-flight conversion error and is never misattributed as a conversion failure). Worst case is a pack
  left unlocked — never data loss; with the provenance guard (§3), an interrupted create→delete window no longer
  duplicates effects on retry.
- Expected console noise on the conversion load (briefed to the manual verifier, §6): stale worlds already emit one
  red `Failed to initialize Item … "effect" is not a valid type` per legacy item on EVERY load, and the deletion of
  each invalid item additionally emits one red, caught `Failed data preparation` error (its temp doc's
  `prepareDerivedData` runs against a plain-object `system`). Both classes appear on the conversion load only —
  **silence on the second load is the pass signal**.
- `docs/OPEN_BUGS.md` #8 (the world-converter blind spot) is logged with this spec and deleted by the implementation
  that ships this design (hygiene rule: completed entries are deleted).

## 6. Testing

- **Unit:**
  - `buildEffectData` against raw source fixtures — active/inactive permanent effects, duration variants, the
    `active` normalization cases (string `'true'` / string `'false'` / missing), sparse template-era sources
    (missing `check` / `customTrait` → `undefined`), and the `convertedFromItem` provenance stamp.
  - Discovery against `_source`-shaped fixtures that include unregistered-type (`effect`) entries, plus the
    provenance skip-guard (already-converted source → create skipped, delete still issued).
  - Pack-iteration gate logic against a faked pack object whose index entries use the REAL projected shape
    (`{ _id, name, img, type, sort, folder }` per item — no `system`): index with/without legacy items (gate skips
    clean packs), locked/unlocked (asserts the `configure(unlock) → convert → configure(re-lock)` call order),
    per-actor failure isolation, a wholesale unlock failure (rejects, lock still restored), and a re-lock failure
    (resolves, restore-specific error logged).
  - **Wiring:** the default export, invoked with a stubbed `game`, reaches `convertWorldActorPacks` (the fake pack
    receives its `getIndex` call) — the single activation line is otherwise invisible to every other test.
- **E2E (shallow by necessity):** seeding an unregistered-subtype item at runtime is impossible by design —
  server-side strict validation rejects creation. E2E therefore covers the safe plumbing: create a world Actor pack
  with a clean actor at runtime → reload-boot path runs the converter → no-op, lock state intact, no console errors,
  AND no per-pack conversion/error log lines for the fixture pack (lock-state symmetry alone cannot distinguish
  "gate skipped" from "unlocked and re-locked"; the absent-line assertions close that, paired with the unit wiring
  test that proves the scan runs at all). The mid-file `page.reload()` is a NEW idiom in this harness — guard it
  with a `waitForURL('**/game')` immediately after the reload so a lost session fails crisply.
- **Manual (deep path):** run against a copy of a real pre-conversion world containing a packed actor with legacy
  effect Items — confirm the items become equivalent `effect` AEs with no leftovers, matching the predecessor spec's
  section 6.7 verification mode. The verifier must be briefed on the two expected red-error classes on the
  conversion load (§5) — the pass signal is the SECOND load's silence.

## 7. Documentation upkeep

- Delete `docs/TODO.md` #6 and `docs/OPEN_BUGS.md` #8 when this ships.
- Update the `titan-codebase` skill where it describes the converter's scope (migration data-flow notes).
