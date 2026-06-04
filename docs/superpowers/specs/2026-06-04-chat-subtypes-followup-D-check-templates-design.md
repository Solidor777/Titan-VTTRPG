# Follow-up D — Check chat schemas from single-source templates (+ item-check propagation fix)

Date: 2026-06-04. Branch off `main`. Part of the chat-message-subtypes roadmap (Phase 1 checks +
Phase 2 items shipped; B shipped). This is **follow-up D**.

## Summary

Two coupled changes, both inside this spec:

1. **Structural (single source of truth):** the 5 check chat-message schemas stop storing
   `parameters`/`results` as one shared untyped `ObjectField` bag and instead become **typed
   per-subtype schemas built from the same shape that seeds the check-engine factories** — via the
   existing `buildSchemaFromShape` helper (the tool shipped in B). The check engine's
   parameter/result factories and the chat schema then share one field-set definition that cannot
   drift.
2. **Gameplay correctness (item-check, user-confirmed):** `CharacterDataModel.getItemCheckParameters`
   currently does **not** faithfully propagate the item's check config into the rolled `parameters`
   that get snapshotted into the chat card. As a result the opposed-check / resistance-check
   **damage-reduction feed is dead** — the opposing attribute/resistance check is always rolled with
   `damageToReduce = 0`. This spec fixes the propagation so the feature works as designed, and the
   now-complete parameters object is what the typed schema models ("model it properly").

The user chose **Approach B** (single-source via factory refactor) over per-field overrides, and
**Path 2** (model `opposedCheck` properly) over a nullable-bag, and chose to do the propagation fix
**inside D**.

## Goals

- Each check's parameter/result **field set** is defined once (a co-located zero-value "shape") and
  consumed by BOTH the runtime factory AND the chat-message schema.
- The 5 check chat schemas are typed per subtype, capturing the genuine divergence (resistance ≠
  attribute; attack/casting/item each add fields).
- The item-check rolled `parameters` faithfully mirror the item's check config, so the opposed and
  resistance damage-reduction actually feeds the opposing check.
- No regressions: every existing read path (`system.parameters.X`, `system.results.X`, and nested
  paths) resolves exactly as before; check unit + e2e at parity.

## Non-goals

- No change to the check **math** (`calculateCheckResults` and the per-subtype result calculations
  keep identical numeric behavior — only the *assembly* of the returned object changes).
- No change to the producer (`Check.sendToChat`) or the chat-mount/render path.
- No broad refactor of where parameters are assembled — the actor's `CharacterDataModel` remains the
  orchestrator (confirmed acceptable; only the *propagation completeness* is fixed).
- No `flags.titan` involvement — checks already write `system.{parameters,results,…}`.

## Background — current state (verified)

- **Factories are transformations, not literals.** `create<T>CheckParameters(options)` and
  `calculate<T>CheckResults(diceResults, parameters)` build populated objects from runtime inputs.
  There is no static shape literal to feed `buildSchemaFromShape` (unlike the item side's
  `*SystemTemplate.js`). New co-located shapes must be authored.
- **Chat schema today:** `CheckChatMessageDataModel._defineDocumentSchema()` defines
  `parameters`/`results` as untyped `createObjectField()`, plus `failuresReRolled` and `message`.
  All 5 leaf chat DataModels only override the `component` getter; they inherit the untyped bag.
- **Chat DataModel hierarchy:** `TitanChatMessageDataModel` → `CheckChatMessageDataModel` →
  `AttributeCheckChatMessageDataModel` → {`AttackCheckChatMessageDataModel`,
  `CastingCheckChatMessageDataModel`, `ItemCheckChatMessageDataModel`}; `ResistanceCheck…` extends
  `CheckChatMessageDataModel` directly. The hierarchy shares only `component`/behavior — the
  parameter/result shapes diverge, so **each leaf must define its own typed schema** (it cannot
  inherit attribute's).
- **Producer:** `Check.sendToChat()` builds `system = { parameters: this.parameters, results:
  this.results, failuresReRolled, message? }` and calls `ChatMessage.create({ type, system })`. So a
  typed schema validates/cleans these on creation; the contract is simply "factory output conforms
  to the schema" — which Approach B guarantees by construction (factory spreads the shape).
- **Divergence:** 5 distinct parameter shapes, 4 distinct result shapes.
  - Results: base `{ dice[], expertiseRemaining, criticalSuccesses, criticalFailures,
    extraSuccesses, succeeded, successes }`; +`damageTaken` (attribute, resistance); +`damage`
    (attack); +`damage`/`healing`/`opposedCheckComplexity` (item);
    +`damage`/`healing`/`extraSuccessesRemaining`/`scalingAspect[]` (casting).
  - Parameters: attribute has skill/training/`attribute`; resistance drops those, adds
    `resistance`/`resistanceDice`; attack adds `cleave`/`attackTrait[]`/`damage`/…; casting adds
    `scalingAspect[]`/healing/`tradition`; item adds `opposedCheck`/`damage`/`healing`/…
- **`buildSchemaFromShape` fit:** all numeric values are integers (→ integer fields, matching the
  helper's documented assumption). Object-valued arrays (`dice`, `scalingAspect`, `customTrait`,
  `attackTrait`) seed `[]` → `ArrayField` with an untyped `ObjectField` element — correct (the
  `string[]` JSDoc typedefs are stale; runtime elements are objects, e.g. `trait.name`/`.value`).

## Design

### Part 1 — Single-source shapes (Approach B)

Add an exported zero-value shape function **next to each factory, in the same file**, so the shape
and the factory are visibly adjacent and the factory spreads the shape.

- **Results, composed (mirrors the existing `baseResults` composition):**
  - `CheckResults.js`: add `export function createCheckResultsShape()` returning the 7 base fields at
    zero (`dice: []`, numbers `0`, `succeeded: false`). `calculateCheckResults` returns
    `{ ...createCheckResultsShape(), …computed }` (byte-identical output).
  - Each `<T>CheckResults.js`: `export function create<T>CheckResultsShape()` returning
    `{ ...createCheckResultsShape(), …subtype extras }`. The factory spreads the subtype shape.
- **Parameters, flat per subtype (no base factory exists; keep the engine change minimal):**
  - Each `<T>CheckParameters.js`: `export function create<T>CheckParametersShape()` returning every
    field at its zero value. The factory becomes `{ ...create<T>CheckParametersShape(),
    …option/computed values }` — same output as today.
- **Behavior preservation:** spreading a zero-shape then re-assigning the option/computed fields
  yields output identical to the current explicit literals. Fields that are currently always-zero
  come from the shape; fields that come from options are still assigned explicitly.

### Part 2 — Typed per-subtype chat schemas

- `CheckChatMessageDataModel`: keep `failuresReRolled` + `message`; **drop** the untyped
  `parameters`/`results`. Add a static helper:
  ```js
  static _defineCheckDataSchema(parametersShape, resultsShape) {
     return {
        parameters: createSchemaField(buildSchemaFromShape(parametersShape)),
        results: createSchemaField(buildSchemaFromShape(resultsShape)),
     };
  }
  ```
- Each of the 5 leaf chat DataModels overrides `_defineDocumentSchema()`:
  ```js
  return {
     ...super._defineDocumentSchema(),
     ...CheckChatMessageDataModel._defineCheckDataSchema(create<T>CheckParametersShape(),
                                                         create<T>CheckResultsShape()),
  };
  ```
  (attack/casting/item inherit attribute's two keys via `super` and overwrite them with their own —
  correct; tiny init-time waste only.)
- All read paths preserved: `system.parameters.X`, `system.results.X`, nested
  `scalingAspect[].*`, `dice[].*`, `trait.*`, `opposedCheck.*`.

### Part 3 — Item-check propagation / correctness (Path 2, gameplay)

Confirmed intended behavior: the rolled `parameters` should mirror the item's `checkData` so the
opposed/resistance damage-reduction feeds the opposing check.

**`CharacterDataModel.getItemCheckParameters` (≈ lines 3619-3672):**
- Propagate `isDamage` and `isHealing` from `checkData` onto `parameters` (currently read as
  conditions only, never copied).
- Build `opposedCheck` as a **complete, always-present** object
  `{ enabled: checkData.opposedCheck.enabled, attribute, skill }` (carry `enabled`; drop the
  polymorphic `false`/object). It becomes a typed nested object, not a bag.
- Fix the `damageReducedBy` gate (line 3656): test **`checkData.damageReducedBy`**, not
  `parameters.damageReducedBy` (which is the always-`'none'` default), so `parameters.damageReducedBy`
  is actually set from the item config when an opposed/resistance reduction is configured.

**`ItemCheckParameters.js`:** the new shape includes `isDamage: false`, `isHealing: false`,
`opposedCheck: { enabled: false, attribute: '', skill: '' }` (typed nested), and keeps
`damageReducedBy: 'none'`.

**Trait fields — only `customTrait` exists (stale `itemTrait` reads).** Item and casting check
parameters have a single trait collection, `customTrait` (propagated at lines 3193/3635). There is
**no `itemTrait` field.** Some of their Svelte components read `parameters.itemTrait`
(`ItemCheckChatItemTraits.svelte:11`, guarded by `ItemCheckChatMessage.svelte:32`, and
`CastingCheckChatMessage.svelte:41`) — **those reads are out of date** and resolve to nothing today.
Repoint them to `parameters.customTrait`. The item/casting parameter shapes therefore include
`customTrait: []` only. (This is a concrete payoff of typing the schema: the stale `itemTrait` paths
no longer exist on the model, and the audit catches them.)

**`ItemCheckChatMessage.svelte`:**
- Opposed section guard `{#if …parameters.opposedCheck}` → `{#if …parameters.opposedCheck.enabled}`
  (opposedCheck is always an object now; preserves the visible "render when enabled" behavior).
- Resolve the stale `opposedCheck.difficulty` read (no data source anywhere): drop the `difficulty`
  prop so the opposed **attribute check** uses its default difficulty (verify
  `ChatMessageOpposedAttributeCheckButton` default during implementation).

**Propagation audit (explicit task — the authority on field-level specifics).** The brainstorm
surfaced that several `parameters.X` reads in the item/casting cards may not be faithfully set on the
rolled parameters, but the exact set has been mis-read more than once, so it is deliberately NOT
frozen here. The implementation MUST, with the code and tests in hand:
1. Enumerate every `system.parameters.X` / `system.results.X` read in `ItemCheckChatMessage.svelte`,
   `CastingCheckChatMessage.svelte`, and ALL their child components.
2. For each read, confirm the field is (a) set on the rolled parameters by the relevant
   `get<T>CheckParameters` / check class, and (b) present in the typed shape.
3. For each unbacked read, choose the right fix per field:
   - **Repoint a stale read to the real field** when the data exists under another name — confirmed
     case: `parameters.itemTrait` → `parameters.customTrait` (there is no `itemTrait`; the components
     are out of date).
   - **Propagate from the item roll data** when the card is meant to show a field that genuinely isn't
     copied onto the rolled parameters — confirmed intent: `isDamage` / `damageReducedBy` /
     `opposedCheck.enabled`.
   - **Remove a genuinely sourceless read** — confirmed case: `opposedCheck.difficulty` has no source
     anywhere; drop it so the opposed attribute check uses its default difficulty.
4. Apply the same audit at a lighter touch to the attribute/resistance/attack cards (confirm their
   reads against the new typed shapes).

Definitively established in the brainstorm (safe to treat as known): there is **no `itemTrait`
field** — item/casting use `customTrait`, and the components reading `itemTrait` are stale (repoint
them). `parameters.damageReducedBy` is stuck at `'none'` (line 3656 self-comparison) and must be
sourced from `checkData.damageReducedBy`; `parameters.isDamage`/`isHealing` are read as conditions but
not copied onto parameters. Anything else the audit turns up is decided against the code — do not
assume. Any unbacked read that turns out to be a genuinely separate
bug not required for D is logged to `docs/OPEN_BUGS.md`, not silently fixed.

**Gameplay effect:** the opposed-check button and the resistance-check button now pass a non-zero
`damageToReduce` (= `results.damage`) to the opposing check when the item configures
`damageReducedBy = 'opposedCheck' | 'resistanceCheck'`. The receiving side already computes
`damageTaken = damageToReduce − successes` (attribute/resistance results), so the reduction goes
live end-to-end. This is the one behavioral change and is covered by new e2e (below).

## Data integrity

- Chat messages are **ephemeral log snapshots**, not authored document data — lower risk than B. Old
  messages created before this change re-render through the typed schema; missing fields take the
  schema defaults, unknown fields are dropped. Acceptable for transient log entries.
- After Part 3, `opposedCheck` is **no longer polymorphic** (always `{ enabled, attribute, skill }`),
  so it types cleanly as a nested `SchemaField` — no nullable-bag workaround needed.

## Testing / verification

- **Golden-master unit test** `tests/unit/CheckChatMessageSchemaEquivalence.test.js` — hand-authored
  literal expectation of all 5 typed chat schemas (field kind + required/nullable/integer + resolved
  initials; omit `ArrayField` element initials, which are inert), mirroring B's
  `ItemDataModelSchemaEquivalence.test.js`. Locks the typed schemas.
- **Factory ↔ shape parity unit test** — for each subtype, `Object.keys(factoryOutput).sort()` ===
  `Object.keys(create<T>…Shape()).sort()` for both parameters and results, proving the factory and
  the shape cannot drift in field set.
- **Existing check unit tests** (CheckResults / per-subtype) at parity.
- **e2e (existing) at parity:** `interaction-rolls`, `checks-*`, item-cards, render smokes.
- **e2e (new)** — opposed/resistance damage-reduction feed: configure an item check with
  `isDamage` + `damageReducedBy = 'opposedCheck'` (and a sibling with `'resistanceCheck'`), roll it,
  assert the opposed/resistance button rolls a check that receives a non-zero `damageToReduce` and
  the result shows reduced `damageTaken`.
- `npm run build` clean (single chunk, no dynamic imports, probe-free).

## Files touched (≈ 20, + audit)

- Shapes + factory spread (11): `CheckResults.js` (base shape) + 5 `*CheckParameters.js` + 5
  `*CheckResults.js`. (Item params add `isDamage`/`isHealing` + typed `opposedCheck`; item/casting
  trait field stays `customTrait` only — no `itemTrait`.)
- Chat schemas (6): `CheckChatMessageDataModel.js` (helper, drop untyped fields) + 5 leaf
  `*CheckChatMessageDataModel.js`.
- Item/casting propagation (1, scope confirmed by the audit): `CharacterDataModel.js`
  (`getItemCheckParameters` + `getCastingCheckParameters` — fix the `damageReducedBy` gate; copy
  `isDamage`/`isHealing`; carry `opposedCheck.enabled`).
- Stale component reads (3+): `ItemCheckChatItemTraits.svelte` + `ItemCheckChatMessage.svelte`
  (`itemTrait` → `customTrait`; opposed guard → `.enabled`; drop stale `difficulty`) and
  `CastingCheckChatMessage.svelte` (`itemTrait` → `customTrait`); plus any further stale reads the
  audit surfaces.
- Tests (2 new): `CheckChatMessageSchemaEquivalence.test.js`, factory↔shape parity test (may live in
  an existing or new unit file).

## Risks

- **Behavioral (Part 3):** reviving the reduction feed changes gameplay; mitigated by new e2e and by
  the user-confirmed intended behavior.
- **Schema strictness on old messages:** typed `SchemaField` drops unknown / defaults missing fields
  on re-render of pre-change messages — acceptable for ephemeral log entries.
- **Hidden propagation gaps:** other stale reads may exist; the propagation-audit task is the
  mitigation. Any genuinely separate bug discovered (not needed for D) is logged to
  `docs/OPEN_BUGS.md`, not silently fixed.

## Rules (CLAUDE.md)

Route `.js`/`.svelte` edits through `titan-svelte-dev` (load `svelte-5`, `foundry-vtt`,
`foundry-svelte`). No dynamic imports / test code in shipping builds. Update `docs/TODO.md` and the
`titan-codebase` skill on completion. Never `git add packs/`. e2e is world-launch-gated.
