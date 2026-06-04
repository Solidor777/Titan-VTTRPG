# Follow-up B — Item DataModels build their schema from the shared templates

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Route ALL
> `.js` edits through the `titan-svelte-dev` subagent; have it load `foundry-data-models`, `foundry-vtt`,
> `titan-codebase`. NEVER `git add packs/` — stage explicit paths only. Test source = `tests/` (plural).

**Goal (single source of truth):** make the 7 item DataModels define their `system` schema from the SAME
shared shape templates the item chat-message DataModels already use, so the item schema and the chat
template can never drift. **DATA-INTEGRITY SENSITIVE — it changes the schema of real actor/item data, so
every change is gated by a byte-exact schema-equivalence characterization test.**

## Resolved design (user decision 2026-06-04): APPROACH C — generalize the helper

`buildSchemaFromShape` is generalized so the templates can express EVERY current item-schema default with
zero hand-written per-field overrides in the DataModels:

1. **Array fields → untyped `ObjectField` element + initial seeded from the template array.** Today the
   helper makes a non-empty array's element a *typed* `SchemaField` and always defaults the array initial
   to `[]`. New semantics: an array element whose representative value is a plain OBJECT → `createObjectField()`
   (untyped bag, matching how the item DMs store every object array); a PRIMITIVE element keeps its typed
   field (string/number/bool); and the array's `initial` is a `structuredClone` of the template array (the
   template array IS the field's default contents). Empty array → `createArrayField(createObjectField(), [])`
   (unchanged). NON-array plain objects still map to a typed `SchemaField` (so `armor {max,value}` and
   `castingCheck {...}` stay typed — unchanged).
2. **`xpCost` lives in the templates.** `SpellSystemTemplate`/`AbilitySystemTemplate` return
   `xpCost: defaultXpCostSpell()` / `defaultXpCostAbility()` (evaluated at schema-build time — identical
   timing/result to the current `createIntegerField(defaultXpCost…())` in the DMs). No DM override.
3. **`documentVersion` stays sourced from `super._defineDocumentSchema()`** (a non-integer `NumberField`);
   it is NEVER added to a template.

### Why this is byte-exact (from the divergence investigation)
- armor / shield / equipment / commodity and the `rulesElement` layer are ALREADY equivalent.
- `check` / `customTrait` (base) / `attack` (weapon) / `customAspect` (spell) currently carry a
  representative element → today's helper makes them TYPED; the item DMs store them UNTYPED. Approach C's
  object-array→`ObjectField` rule fixes this WITHOUT emptying `attack` (so weapon keeps its default attack).
- An `ArrayField` **element's own `initial` is inert** (Foundry populates the array from the array's own
  `initial`, never the element's). So the current weapon element `createObjectField(() => attackTmpl())`
  and the refactored `createObjectField()` are equivalent; the meaningful default lives in the array
  initial, which approach C reproduces (`[attackTmpl()]`). The gate fingerprint therefore compares the
  array's initial but OMITS the element's own initial.

## Verification gate (NON-NEGOTIABLE)
- **Agent-side (per task):** the characterization test (Task B0) + the full unit suite (`npm test`) green,
  and `npm run build` clean (single chunk, probe-free, no dynamic imports).
- **User-gated (after agent-side passes):** Foundry RELAUNCH (item doc schema changes register at world
  load) → item-sheet e2e (`render-smoke`, `reactive-*`, `traits`, `trait-add-custom`, `rules-element-crud`)
  + chat re-verify (`item-cards.spec.js`) + full `npm run test:e2e` at parity.

---

## Task B0 — Characterization gate (FIRST, before any source change)

**File:** `tests/unit/ItemDataModelSchemaEquivalence.test.js` (new). Source UNCHANGED this task.

- [ ] Install stand-ins (mirror `ItemChatMessageDataModel.test.js` + `BuildChatMessageData.test.js`):
  `foundry.data.fields` mock classes (record `options`, `element`, `fields`), `foundry.abstract.TypeDataModel`,
  `foundry.applications.api.ApplicationV2 = class {}`, `globalThis.Item = class {}`,
  `game.i18n.localize = (k)=>k`, and `game.settings.get = (ns,key)=>SENTINELS[key]` with DISTINCT sentinel
  values per setting (e.g. `'defaultXpCost.spell' -> 7`, `'defaultXpCost.ability' -> 9`) so the golden also
  proves which setting feeds `xpCost`. Dynamically import the 7 real type DMs (weapon/armor/spell/ability/
  shield/equipment/commodity).
- [ ] Write a `fingerprint(field)` helper: records `{ kind, required, nullable, integer? }` for every field;
  for an `ArrayField` ALSO records the resolved `initial` (deep-serialized; call function-initials) and
  recurses into `element` recording ONLY `{kind, required, nullable, integer?}` (OMIT the element's own
  `initial` — inert); for a `SchemaField` recurses into each sub-field with the FULL fingerprint (incl.
  initial); for scalar leaves records `initial`.
- [ ] For each of the 7 types: fingerprint `Type._defineDocumentSchema()`, freeze the result as a committed
  `expected` golden (inline per-type objects preferred — they document the schema contract and are
  reviewable), assert `fingerprint(live) === expected`. Run green against CURRENT code. Commit.
- [ ] If a type DM cannot be imported under the stand-ins, report BLOCKED (fallback: hand-author the golden
  from the DM source) — do NOT weaken the fingerprint to make it pass.

## Task B1 — Generalize `buildSchemaFromShape` + update its tests

**Files:** `src/helpers/utility-functions/BuildSchemaFromShape.js`; update `tests/unit/BuildSchemaFromShape.test.js`
and `tests/unit/ItemChatMessageDataModel.test.js`.

- [ ] Rewrite the array branch of `buildFieldFromValue` per design item 1 (object/empty element →
  `createObjectField()`; primitive element → its typed field; array `initial = structuredClone(value)`).
  Update the JSDoc on both `buildFieldFromValue` and `buildSchemaFromShape` to describe the new array
  semantics (array literal = the field's default contents; object array elements are untyped bags).
- [ ] Update `BuildSchemaFromShape.test.js`: the "array of objects → SchemaField element" assertions become
  `ObjectField` element; add assertions that the array `initial` is seeded from the template contents;
  primitive-array and nested-object (non-array) assertions stay. 
- [ ] Update `ItemChatMessageDataModel.test.js`: `schema.attack.element` is now `MockObjectField` (drop the
  `element.fields.label/damage` sub-field assertions).
- [ ] `npm test` green (B0 still green — type DMs don't call the helper yet). Commit.

## Task B2 — Finalize the shared templates

**Files:** `src/document/types/item/ItemSystemTemplate.js`,
`src/document/types/item/types/spell/SpellSystemTemplate.js`,
`src/document/types/item/types/ability/AbilitySystemTemplate.js` (+ confirm the other type templates).

- [ ] `ItemSystemTemplate`: `check: []` and `customTrait: []` (empty → untyped `ObjectField` element,
  default `[]` — matching the base item DM). Remove the now-unused representative-element imports if dead.
- [ ] `SpellSystemTemplate`: `customAspect: []`; `xpCost: defaultXpCostSpell()` (import the helper).
- [ ] `AbilitySystemTemplate`: `xpCost: defaultXpCostAbility()` (import the helper).
- [ ] CONFIRM `WeaponSystemTemplate.attack` STAYS `[createWeaponAttackTemplate()]` (its default attack);
  `trait`/`aspect`/`rulesElement` stay `[]`; `armor {max,value}` / `castingCheck {...}` stay object literals.
- [ ] Update template JSDoc comments to match (object array elements are untyped bags; a non-empty array is
  the default contents). `npm test` green (B0 still green; chat DMs now produce untyped elements + seeded
  initials — already reflected by B1's test updates). Commit.

## Task B3 — Refactor the item DataModel hierarchy

**Files:** `src/document/types/item/TitanItemDataModel.js`,
`src/document/types/item/RulesElementItemDataModel.js`, and the 7 `<Type>DataModel.js`.

- [ ] Each `static _defineDocumentSchema()` returns `{ ...super._defineDocumentSchema(),
  ...buildSchemaFromShape(create<Fragment>Template()) }`. Compose so each layer contributes ONLY its own
  fields: base `TitanItemDataModel` → `createItemSystemTemplate()`; `RulesElementItemDataModel` →
  `createRulesElementTemplate()`; each `<Type>DataModel` → the type-specific fields. **Do not double-apply
  shared fragments** — mirror exactly how the chat-DM hierarchy composes the templates (read those leaves
  first). `documentVersion` comes only from `super` (the base `TitanDataModel`), never a template.
- [ ] **Keep ALL derived-data methods, `getRollData()`, dialogs, `_getInitialDocumentData`, default
  image/name, and every other instance method untouched — ONLY the schema DEFINITION changes.**
- [ ] Re-run Task B0's characterization test → MUST pass for all 7 types (proves byte-exact equivalence).
  `npm test` (full) green. `npm run build` clean (single chunk, probe-free, no dynamic imports). Commit.

## Task B4 — User-gated e2e (do NOT merge before this passes)
- [ ] **USER STEP:** restart Foundry, relaunch the world on `:30000`.
- [ ] `npx playwright test tests/e2e/item-cards.spec.js` + the item-sheet specs (`render-smoke`,
  `reactive-ability`/`-armor-shield`/`-weapon`/`-spell`/`-inventory-basic`, `traits`, `trait-add-custom`,
  `rules-element-crud`) green. Then full `npm run test:e2e` at parity.

## Task B5 — Docs + finish branch
- [ ] `docs/TODO.md`: mark follow-up B DONE; note D + Phases 3/4 remain. Update `docs/superpowers/HANDOFF.md`.
- [ ] `titan-codebase` skill (`abstractions.md`/`conventions.md`): document that item DMs + item chat DMs
  share the shape templates via `buildSchemaFromShape` (array literal = default contents; object array
  elements are untyped bags; `xpCost` defaults live in the templates) — current state, not changelog.
- [ ] Finish via `superpowers:finishing-a-development-branch` (merge to `main`).
