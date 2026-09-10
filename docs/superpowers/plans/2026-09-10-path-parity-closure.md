# Path Parity Closure — implementation plan

Spec: `docs/superpowers/specs/2026-09-10-path-parity-closure-design.md`. Branch: `campaign/backlog-closeout`
(already checked out; do NOT switch branches — `packs/**` is a live database and blocks checkout). Commit
after each task once its verification passes. Never stage `.claude/agents`, `.claude/claude.md`,
`.claude/settings*.json`, `.claude/skills/graphify/**`, the root `CLAUDE.md` deletion, `packs/effects/**`,
or the root `*.png` files — those are another session's uncommitted work. Never stage `tests/e2e/zz-*.spec.js`.

## Task 1 — Actor schema characterization test (BEFORE any refactor)

1. Add `tests/unit/ActorDataModelSchemaEquivalence.test.js` modelled on
   `tests/unit/ItemDataModelSchemaEquivalence.test.js`: `installSchemaMocks()`, mock
   `game.settings.get` with implausible sentinels for every setting the character schema reads
   (`staminaBaseMultiplier`, `resolveBaseMultiplier`, and each `defaultAttribute*` skill setting — read
   `src/helpers/Settings/*.js` for the exact keys and return distinct sentinel strings/numbers), stub
   `globalThis.Actor = class {}` (and whatever else the dynamic import of
   `~/document/types/actor/types/character/types/player/PlayerDataModel.js` and
   `.../npc/NPCDataModel.js` needs), then fingerprint `PlayerDataModel.defineSchema()` and
   `NPCDataModel.defineSchema()` with `fingerprintSchema`.
2. Author the golden literals by running the fingerprint once against the CURRENT hand-written schema and
   transcribing the output (characterization test — the current schema IS the specification here), using
   the harness helpers (`integerField`, `stringField`, `booleanField`, `schemaField`, `numberField`).
   Note `createIntegerField()` with no initial yields initial 0; `createStringField(null)` yields a
   nullable StringField with initial null; `documentVersion` is a non-integer NumberField.
3. Run `npx vitest run tests/unit/ActorDataModelSchemaEquivalence.test.js` — green. Commit:
   `test: characterize the actor data model schemas before templating them`.

## Task 2 — `buildSchemaFromShape` pass-through

1. In `tests/unit/BuildSchemaFromShape.test.js` add a case: a shape value that is an instance of
   `foundry.data.fields.DataField` is returned as-is (same object identity) at top level and nested.
   Add `MockField` as `foundry.data.fields.DataField` in `installSchemaMocks()`
   (`tests/unit/helpers/schemaFingerprint.js`) and in that test's local mocks if it installs its own.
2. Implement in `src/helpers/utility-functions/BuildSchemaFromShape.js`: before the array/object checks,
   `if (value instanceof foundry.data.fields.DataField) { return value; }` — update BOTH doc comments
   (the mapping list and the function summary) to state the pass-through rule and why it exists
   (nullable string ids cannot be expressed by a plain value).
3. `npx vitest run tests/unit/BuildSchemaFromShape.test.js` green; `npx eslint src/helpers/utility-functions/BuildSchemaFromShape.js --quiet` clean. Commit.

## Task 3 — Actor shape templates

1. Create `src/document/types/actor/types/character/CharacterSystemTemplate.js` exporting
   `createCharacterSystemTemplate()` plus the sub-shape factories named in the spec. Reproduce the
   hand-written schema exactly (same keys, same initials, same settings getters, same order is not
   required). `equipped.armor` / `equipped.shield` are `createStringField(null)` pass-through fields.
2. Create `.../types/player/PlayerSystemTemplate.js` (`createPlayerSystemTemplate()`) and
   `.../types/npc/NPCSystemTemplate.js` (`createNPCSystemTemplate()`); each spreads the character template
   and adds its fields (`bio.type` is added by spreading `bio: { ...character.bio, type: '' }`).
3. Replace `CharacterDataModel._defineDocumentSchema()` with
   `{ ...super._defineDocumentSchema(), ...buildSchemaFromShape(createCharacterSystemTemplate()) }`;
   delete the local `create*Field` closures and now-unused imports (including the `defaultAttribute*`
   imports if they move to the template). Replace the Player and NPC overrides the same way (the NPC's
   `extendFields` workaround and its comment go away). Update every JSDoc these edits touch.
4. `npx vitest run` — the Task 1 suite MUST still pass unchanged (if it fails, the template is wrong; fix
   the template, never the golden). ESLint clean. Commit: `refactor: build the actor schemas from shape templates`.

## Task 4 — Report resource snapshot paths

1. Update the eight report shape factories (damage, healing, long-rest, spend-resolve, turn-start,
   turn-start-revert, turn-end, turn-end-revert) to nest the resource placeholders under `resource`
   exactly as the spec lists; update each factory's doc comment.
2. Update the 11 producer sites in `src/document/types/actor/types/character/CharacterDataModel.js`
   (grep `retVal\.(stamina|wounds|resolve) = |reportData\.(stamina|wounds|resolve) = `) to write under
   `resource`. Keep the existing conditional-presence logic; build the `resource` object so a report with
   no snapshot still validates (an absent `resource` key is fine — the SchemaField initializes to nulls).
3. Update the readers: `ChatMessageStamina.svelte`, `ChatMessageWounds.svelte`, `ChatMessageResolve.svelte`
   (`src/document/types/chat-message/components/resources/`), the six report shells/components listed by
   `grep -rn "system\.\(stamina\|wounds\|resolve\)\b" src --include=*.svelte | grep -v system.resource`,
   and `ChatMessageRevertFastHealingButton.svelte`. After the edit that grep must return nothing.
4. Add `static migrateData(source)` to `src/document/types/chat-message/report/ReportChatMessageDataModel.js`
   that hoists legacy top-level `stamina`/`wounds`/`resolve` into `source.resource` (create the object if
   missing; do not overwrite a nested value already present; delete the legacy key), then returns
   `super.migrateData(source)`. Document the invariant: legacy keys exist only on pre-2026-09-10 messages.
5. Re-author the affected entries in `tests/unit/ReportChatMessageSchemaEquivalence.test.js`
   (`resource: { type: 'SchemaField' }`) and extend that suite with a nested assertion that each report's
   `resource` sub-fields are exactly the spec's set of nullable `ObjectField`s. Add a unit test for the
   hoist (`ReportChatMessageDataModel.migrateData` with legacy keys → nested; idempotent on nested input).
6. `npm run build` (the live Foundry at :30000 serves this directory), then extend
   `tests/e2e/report-cards.spec.js`: in the `applyDamage posts a damageReport card` case also return the
   message's `system.resource.stamina` / `system.resource.wounds` and the actor's live
   `system.resource.stamina.max` / `wounds.max`, and assert the snapshot maxima equal them; add a case
   that creates a `damageReport` ChatMessage with legacy `system.stamina = { value: 1, max: 6 }` (use
   `ChatMessage.create` with `type: 'damageReport'`, `system: { actorName, actorImg, damageTaken: 1,
   stamina: {...} }`) and asserts `game.messages.get(id).system.resource.stamina.max === 6` plus that
   the rendered card in `#chat` shows the Stamina row (`showChatLog` is already called in `beforeAll`).
7. Run `npx playwright test report-cards socket-sync --reporter=line` (foreground, from the repo root) —
   all green. Commit: `feat: snapshot report resources at the actor's system.resource paths`.

## Task 5 — Documentation

1. `docs/TODO.md`: delete `### 12.` and the whole "## Chat message subtypes — related items" section
   (it has no other entries).
2. `titan-codebase` skill (`.claude/skills/titan-codebase/references/`): `abstractions.md` — actor data
   models build from `create{Character,Player,NPC}SystemTemplate()`; `conventions.md` or `data-flow.md`
   wherever `buildSchemaFromShape` is described — add the DataField pass-through rule; wherever report
   payloads/resource snapshots are described — the `system.resource.*` paths and the `migrateData` hoist.
   Grep the skill for `system.stamina`, `extendFields`, `createBaseStatField`, `buildSchemaFromShape` and
   fix every stale sentence.
3. Commit: `docs: close the path-parity north-star`.

## Final verification (report these numbers)

`npx vitest run` (files/tests), `npx eslint . --quiet`, `npx stylelint "src/**/*.{css,svelte}"`,
`npm run build`, and the targeted e2e list with pass counts. Also `git log --oneline` of your commits.
