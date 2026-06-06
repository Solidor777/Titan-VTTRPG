# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

### 1. `MoveEffectToFolderDialogShell.svelte` captures `initialValue` non-reactively (lint error)

- **What:** `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte:22` does
  `let selectedFolderId = $state(initialValue);`. Svelte's `state_referenced_locally` rule flags this
  as an **error** (`svelte/valid-compile`): `$state(initialValue)` captures only the prop's INITIAL
  value, so if `initialValue` changes after mount the local state won't track it.
- **Severity:** Low / latent. It is the system's only ESLint **error** (surfaced during follow-up D's
  verification) and a matching build-time `[vite-plugin-svelte]` warning. The dialog works in practice
  because `initialValue` does not change during its lifetime.
- **Pre-existing:** present on `main`; NOT introduced by follow-up D (which never touched
  `src/sidebar/tray/`). Out of D's scope.
- **To do:** if the initial-only capture is intended, suppress the rule locally with a comment
  explaining why; otherwise derive it reactively (e.g. `$derived`) or initialize in an effect.

### 2. Attack chat header sub-label is always blank (`attackName` never set by the producer)

- **What:** `AttackCheckChatHeader.svelte:21` renders `document.data.system.parameters.attackName`, and
  `attackName` is a field in `createAttackCheckParametersShape()` (and the typed schema/golden), but
  `CharacterDataModel.getAttackCheckParameters` never assigns `parameters.attackName` (grep: zero sets
  across `src/`). So the attack card's sub-label has always rendered blank.
- **Severity:** Low / cosmetic. Surfaced during follow-up D's whole-branch review; D enshrined the
  field into the typed schema but did not introduce the producer gap.
- **Pre-existing:** the producer never set it before D either. Out of D's typing scope.
- **To do:** set it in `getAttackCheckParameters` from the attack data (e.g.
  `parameters.attackName = attackData.label ?? attackData.name ?? ''`); verify the correct source
  field and add an e2e/assertion. (No golden change needed — the shape default stays `''`.)

### 3. Item-check `resistanceCheck` shape default is `''` but guards compare `!== 'none'`

- **What:** `createItemCheckParametersShape()` defaults `resistanceCheck: ''` (inherited from the
  original factory), while the item check template default and all guards use `'none'`
  (`ItemCheckChatMessage.svelte:84` renders the resistance button when `resistanceCheck !== 'none'`).
  For freshly-rolled messages the field is populated from `checkData.resistanceCheck` (always `'none'`
  by default), so this is fine in practice; the mismatch only bites a chat message rendered against the
  typed schema with NO stored `resistanceCheck` value (the schema would then init it to `''`, spuriously
  showing the resistance button with an empty resistance).
- **Severity:** Very low / narrow edge case. Spec explicitly accepted ephemeral-log migration risk.
- **Pre-existing:** the `''` default predates D (original `createItemCheckParameters`).
- **To do:** change the shape default to `resistanceCheck: 'none'` (matches the item template) and
  update the golden's `resistanceCheck` initial from `stringField('')` to `stringField('none')`.

### 4. `report-cards.spec.js` fast-healing apply-confirm e2e flaked once (mechanism unknown)

- **What:** The apply-confirm e2e (`tests/e2e/report-cards.spec.js:410`, "clicking apply heals the actor and
  partial-merges fastHealing") failed once during a full-suite run on 2026-06-05 — the
  `fastHealing.total survived the partial-merge update` assertion expected `2`.
- **Severity:** Flake. It passed in the immediately preceding full run, in a targeted re-run of the file
  (13/13), and in isolation; no code change is implicated and the mechanism is unknown.
- **To do:** Watch for recurrence. If it reproduces, capture the message's stored `system.fastHealing` at
  failure time to determine whether the partial-merge update or the fixture seed raced.

### 5. `WeaponDataModel.addAttack` sheet notification is dead AND mis-targeted (new attacks mount collapsed)

- **What:** `WeaponDataModel.addAttack`
  (`src/document/types/item/types/weapon/WeaponDataModel.js:164-167`) reads the sheet into a local
  (`const sheet = this.parent._sheet;`) but guards on `this._sheet` — `_sheet` on the DATA MODEL, which is
  always `undefined`, so the branch never runs. Even if the guard were fixed, the body calls
  `sheet.postAddCheck()` (which grows the CHECKS-tab `isExpanded` arrays) instead of the attack-expansion
  handler `sheet.addAttack()` (`WeaponSheet.js:51` → `WeaponSheetState.addAttack`, which pushes `true` onto
  both attack `isExpanded` arrays). Net effect: a newly added attack mounts collapsed instead of the
  intended default-expanded (existing attacks initialize expanded — `WeaponSheetData.js:44`). The sibling
  `deleteAttack` (lines 183-186) guards and dispatches correctly (`if (sheet) { sheet.postDeleteAttack(idx) }`).
- **Severity:** Low / cosmetic. The attack is created and persisted correctly; only its initial
  expanded/collapsed UI state is wrong, and one click expands it.
- **Pre-existing:** present on `main`; NOT introduced by the embedded-document-stores branch (which never
  touched `addAttack`).
- **To do:** guard on the local `sheet` and call `sheet.addAttack()`.
- **Found by:** embedded-document-stores Task 4 code review, 2026-06-05.

<!--
Recently resolved: the socket-sync A1/A2 full-run timeout flake was fixed by the e2e Phase 2
shared-world harness (per-file `clearChat` keeps the world lean). Verified: `socket-sync.spec.js`
A1–A5 all passed within a full `npm run test:e2e` run (358 passed, 15.1 min). See `docs/TODO.md` #15.

Recently resolved (Phase 3 reports, branch `feat/chat-subtypes-phase3-reports`):
1. `turnStartRevertReport` / `turnEndRevertReport` rendered BLANK. The two revert reports were produced by
   `CharacterDataModel` but their type keys were absent from `OnRenderChatMessageHTML`'s
   `TITAN_CHAT_MESSAGE_TYPES` set, so the legacy hook never mounted a component. Converting them to first-class
   `ChatMessage` subtypes makes them self-render via `TitanChatMessage#renderHTML`. Covered by the two
   revert-render regression cases in `tests/e2e/report-cards.spec.js`.
2. `RendReportChatMessageHeader` "resisted rend" header showed `undefined`. The component reads
   `document.data.system.rend`, but the producer never carried the rend amount into the report payload.
   `_createRendReportData(armorLost, armor, rend)` now passes `rend` through and the leaf schema types it
   (`RendReportShape.js` `rend: 0` → integer `NumberField`, covered by the golden master), so the resisted-rend
   label renders the real value.
-->
