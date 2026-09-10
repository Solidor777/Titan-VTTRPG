# Path Parity Closure — actor shape template + report resource paths

**Date:** 2026-09-10
**Status:** Approved for execution (autonomous backlog campaign; closes TODO #12's north-star)

## Goal

Close the standing "chat-message ↔ document path parity" strategy (TODO #12). Its north-star reads:
*progressively move all fields on all documents onto consistent `system.*` paths via
`buildSchemaFromShape` (one canonical shape feeding both the source document schema and the
chat-message snapshot schema; chat cards stay historical snapshots)*. Two gaps remain:

1. **The actor family is the last hand-written schema.** `CharacterDataModel`, `PlayerDataModel`, and
   `NPCDataModel` build their `system` schema field by field; every item, effect, check, and report
   already derives from a shape template.
2. **Report cards snapshot resources at a different path than the actor.** Eight report shapes carry
   `system.stamina` / `system.wounds` / `system.resolve` (`{ value, max }`), while the actor's canonical
   paths are `system.resource.stamina` / `.wounds` / `.resolve` (persisted `{ value, mod }` plus the
   derived `max` set in `prepareDerivedData`). A shared component can therefore not read one path on
   both documents. The armor snapshot (`system.armor.{value,max}`, rend and repairs reports) already
   mirrors its source document — the equipped Armor item's `system.armor` — and is left as is.

## Design

### 1. `buildSchemaFromShape` accepts a pre-built field

A shape value that is already a `foundry.data.fields.DataField` instance passes through unchanged.
This is the only way a shape can express a nullable `StringField` (the actor's `equipped.armor` /
`equipped.shield` ids default to `null`; a `null` shape value would build a nullable `ObjectField`,
which rejects the string ids stored in existing actors). The unit harness gains
`foundry.data.fields.DataField = MockField` so the instance check works under the mocks.

### 2. Actor shape templates

- `src/document/types/actor/types/character/CharacterSystemTemplate.js` exports
  `createCharacterSystemTemplate()`, returning the exact persisted shape the hand-written schema
  produces today: `attribute` (body/mind/soul base stats initial 1), `resistance` (derived stats),
  `skill` (18 skills: `defaultAttribute` from the settings getters, `training`/`expertise` base
  stats), `rating` (5 derived stats), `resource` (stamina/resolve initials from the base
  multiplier settings, wounds 0; each `{ value, mod: { static: 0 } }`), `speed` (stride 5, others 0),
  `mod` (5 derived stats), `equipped` (`armor`/`shield` as `createStringField(null)` pass-through
  fields), `bio.description`.
- Sub-shape factories live in the same file (`createBaseStatShape(initial)`, `createDerivedStatShape()`,
  `createSkillShape(defaultAttribute)`, `createResourceShape(initial)`) and replace the local closures
  in `CharacterDataModel._defineDocumentSchema()`, which becomes
  `{ ...super._defineDocumentSchema(), ...buildSchemaFromShape(createCharacterSystemTemplate()) }`.
- `PlayerSystemTemplate.js` (`createPlayerSystemTemplate()` = character template + `xp: { earned: 0 }`,
  `inspiration: false`) and `NPCSystemTemplate.js` (`createNPCSystemTemplate()` = character template
  with `bio.type: ''` added and `role: 'warrior'`) replace the subclass overrides, removing the
  `schema.bio.extendFields` workaround.
- **Schema equivalence is proven by a characterization test written BEFORE the refactor:**
  `tests/unit/ActorDataModelSchemaEquivalence.test.js` fingerprints the player and NPC schemas with the
  shared `schemaFingerprint.js` harness against a committed golden captured from the hand-written
  schemas (settings getters mocked with sentinels so the golden also proves which setting feeds each
  initial). The refactor must leave that test green untouched.

### 3. Report resource snapshots move under `system.resource`

- The eight report shapes that snapshot resources nest them: `resource: { stamina: null, wounds: null }`
  (damage, healing, turnEnd, turnEndRevert), `resource: { wounds: null }` (longRest),
  `resource: { resolve: null }` (spendResolve), `resource: { stamina: null, wounds: null, resolve: null }`
  (turnStart, turnStartRevert). The `null` placeholders stay nullable `ObjectField`s so the cards'
  `if (obj)` presence guards keep working; the change is the path.
- Producers in `CharacterDataModel` (11 write sites: `retVal.stamina = …`, `reportData.wounds = …`, …)
  write `retVal.resource = { stamina: {...}, … }` instead.
- Readers: `ChatMessageStamina` / `ChatMessageWounds` / `ChatMessageResolve` read
  `document.data.system.resource.X.{value,max}`; the six report shells and
  `ChatMessageRevertFastHealingButton` guard on `document.data.system.resource.X`.
- **Legacy cards keep rendering:** `ReportChatMessageDataModel.migrateData(source)` hoists top-level
  `stamina` / `wounds` / `resolve` into `source.resource` when the nested key is absent (idempotent, no
  version gate needed — the legacy keys can only come from pre-change messages). Existing world chat
  history is untouched on disk; the hoist runs on every load.
- `ReportChatMessageSchemaEquivalence` goldens are re-authored from the new shape factories
  (`resource: { type: 'SchemaField' }` at the top level, with a nested assertion that each declared
  child is a nullable `ObjectField`).

### 4. Verification

- Unit: the new actor characterization suite (green before and after), the updated report goldens, and
  `BuildSchemaFromShape.test.js` gains a pass-through case.
- E2E (`report-cards.spec.js`): the damage case asserts the card's `system.resource.stamina.max` and
  `system.resource.wounds.max` equal the actor's live maxima (path parity in the wild), and a new case
  creates a `damageReport` message with legacy top-level `system.stamina` and asserts
  `system.resource.stamina` resolves on the created document (the hoist) while the card renders the
  stamina row.
- Full unit suite, ESLint, stylelint, production build, and the targeted e2e specs must pass.

## Out of scope

- Typing the snapshot `{ value, max }` sub-shape (would default absent snapshots to a truthy object and
  break the presence guards).
- Converging `CharacterSheetResource` with the chat resource rows (edit surface vs display surface —
  the same rejected-pair shape as `ItemSheetSidebarTraits`).
- The armor snapshot path (already at parity with the Armor item).

## Documentation (required final step)

- Delete TODO #12 and its now-empty "Chat message subtypes — related items" section from `docs/TODO.md`.
- Update the `titan-codebase` skill: actor schemas derive from `create{Character,Player,NPC}SystemTemplate()`;
  `buildSchemaFromShape` pass-through rule; report resource snapshot paths + the `migrateData` hoist.
