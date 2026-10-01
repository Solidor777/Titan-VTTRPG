# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 92. A world actor, token or pack holding a base-type Active Effect fails to load (TITAN registers only the `effect` and `condition` AE types)

- **What:** `src/hooks/OnceInit.js` sets `CONFIG.ActiveEffect.dataModels` to `{ effect, condition }`, replacing core's
  `{ base: ActiveEffectTypeDataModel }`, so the client cannot construct a base-type Active Effect (`changes is not
  iterable` in core's `_shimChanges`). Measured live: `createEmbeddedDocuments` with a base-type effect creates
  nothing and raises no error; a world actor holding one stops the world from loading (`game.ready` never set, page
  error from `trackCollectionFailures`); a packed actor holding one loads with the effect in `invalidDocumentIds`, and
  deleting that effect throws and leaves it stored.
- **Found:** 2026-09-30 by the Task 5 fix round (plan B), measured live.
- **Status:** Not handled in code by user decision 2026-09-30 (local worlds cleaned one-off).

### 93. Migration writes into an Adventure pack count as stored when Foundry rejected them

- **What:** The Adventure write target in `src/helpers/migration/StoredActorSources.js` (`createSourceTarget`) never
  checks what `adventure.update` returns. Core resolves `undefined`, without throwing, when the dry-run validation
  fails or a `preUpdate` hook vetoes the write, so the migration counts the actor as updated and can announce
  "complete" over writes that were never stored. The legacy-item converter also saves the actor list between creating
  the new effects and removing the legacy `effect` Items, so that intermediate save still holds an unregistered Item
  subtype, which core validation likely rejects (inferred from core source, not reproduced live). A rejected working
  copy is never reset, so later saves for the same Adventure carry it.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Status:** Open; fixed in Task 5 fix round 2.

### 94. Legacy timed effects converted inside an Adventure are stored enabled after they expired

- **What:** `TitanActiveEffect._preCreate` sets `showIcon` and disables a timed effect whose remaining duration is 0.
  Neither the migration's Adventure write path nor `Adventure#importContent` runs `_preCreate` for embedded effects,
  and `buildEffectData` stores every timed effect with `disabled: false`. An expired timed legacy effect converted
  inside an Adventure therefore applies its rules once the Adventure is imported, while the same effect converted on an
  actor is disabled.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B), read in core source.
- **Status:** Open; fixed in Task 5 fix round 2.

### 95. Migration shows "complete" when a world pack could not be read or re-locked

- **What:** `walkWorldPacks` reports a pack whose projection fails and skips it, and the lock restore logs and swallows
  its own failure. Neither failure is counted, so `migrateWorld` still shows "migration complete". When the only
  pending work sits in an unreadable pack, the scan answers "nothing to migrate" and no failure is ever shown.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Status:** Open; fixed in Task 5 fix round 2.

### 96. Unlinked tokens whose base actor is gone are never migrated in world scenes and Scene packs

- **What:** The stored-actor walker skips an unlinked token without a base actor in world scenes and world Scene packs,
  so its delta keeps legacy `effect` Items and stale condition effects, while the Adventure path migrates such a
  token's delta as data. CLOSED_BUGS #83 says every stored actor is walked, which is not true for these tokens.
- **Found:** 2026-09-30 by the buddy check of the Task 5 fix round (plan B).
- **Status:** Open; fixed in Task 5 fix round 2.

### 98. A stored actor whose migration write a hook vetoed counts as skipped

- **What:** `migrateStoredActors` counts an actor whose writes changed nothing as skipped, so a `preCreate`,
  `preUpdate`, or `preDelete` hook that vetoes a migration write leaves the actor's work pending while the migration
  announces completion, and the next GM load finds the same work again.
- **Found:** 2026-09-30 while planning the fix for #93 (read in code).
- **Status:** Open; fixed in Task 5 fix round 2.

### 99. An Adventure token whose legacy Item overrides its base actor's legacy Item ends up with two converted effects

- **What:** The Adventure walk reads only a scene token's own delta effects, so when the delta holds a legacy `effect`
  Item with the same id as a legacy Item on its base actor (an override, for example an effect toggled on the token),
  the token converts its own copy while the base actor converts the base copy; after import the token holds both
  effects. World tokens avoid this because their synthetic actor reads inherited effects, so creation is skipped by
  stamp. Read in code only: legacy Items cannot be seeded at runtime.
- **Found:** 2026-09-30 while planning the fix for #93.
- **Status:** Open; fixed in Task 5 fix round 2.

### 100. A token's overriding legacy Item converts into a duplicate effect when its base actor's conversion is not stored

- **What:** When a base actor's conversion write is vetoed or not stored, an unlinked token whose delta overrides one of
  the base actor's legacy `effect` Items converts its own copy; when the base actor converts on a later load, the token
  holds both effects. Converted effects get fresh random ids, so core's delta merge (by `_id`,
  `common/documents/actor-delta.mjs` `#mergeEmbeddedCollection`) cannot tell the token's copy overrides the base's.
  Affects world tokens and Adventure tokens. Read in code only: legacy Items cannot be seeded at runtime.
- **Found:** 2026-09-30 while planning the fix for #99.
- **Status:** Open; fixed in Task 5 fix round 2.

### 101. An inherited legacy Item a token removed comes back as a converted effect

- **What:** An unlinked token that removed an inherited legacy `effect` Item holds a tombstone for that Item's id. The
  base actor's conversion creates the replacement effect with a fresh random id, which the tombstone does not hide, so
  the token regains the effect. Affects world tokens and Adventure tokens. Read in code only: legacy Items cannot be
  seeded at runtime.
- **Found:** 2026-09-30 while planning the fix for #99.
- **Status:** Open; fixed in Task 5 fix round 2.
