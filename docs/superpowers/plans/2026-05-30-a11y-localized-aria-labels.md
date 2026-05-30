# A11y Suppression Retirement + Localized aria-labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire every a11y `svelte-ignore` in `EditDeleteTag` and `IconButton`, give every icon-only control a localized accessible name, and route all `aria-label`s through `localize()` — with zero visual change.

**Architecture:** `EditDeleteTag`'s icon `<a>`s become real `<button>`s with a chrome-only CSS reset (preserving the FontAwesome glyph). `IconButton`'s `label` becomes required and its suppression is removed; the label is threaded through the `MiniIconButton`/`DocumentOwnerIconButton` wrappers to every call site. All `aria-label`s use `localize()`, backed by new `lang/en.json` keys.

**Tech Stack:** Svelte 5 (runes), Foundry v14, SCSS, Foundry i18n (`localize()` → `LOCAL.<key>.text`). **No test framework** — verification is `npm run eslint`, `npm run stylelint`, JSON-parse of `lang/en.json`, targeted `grep`, and an in-Foundry visual check.

**Reference:** Spec at `docs/superpowers/specs/2026-05-30-a11y-localized-aria-labels-design.md`.

> **Commit policy:** The user controls commits. Each task ends with a commit step — run it only if the user approved committing; otherwise leave changes in the working tree.

> **CRITICAL a11y note:** Because `IconButton` renders `aria-label={label}` (a dynamic expression that is syntactically always present), the Svelte compiler will NOT re-raise `a11y_consider_explicit_label` even when a consumer passes `undefined`. The linter is therefore NOT a safety net for missing labels. The guarantee comes from Task 7's grep audit, which asserts every `IconButton`/`MiniIconButton`/`DocumentOwnerIconButton` usage includes a `label` prop.

> **Shared convention for all edits:** The localize helper is imported as
> `import localize from '~/helpers/utility-functions/Localize.js';`. For every file edited below, if
> that import is absent, add it alongside the existing imports. All edits follow `.claude/CLAUDE.md`
> (120-col wrap, typed/commented declarations, multiline components with >1 prop). No `:global`.

---

## File map

- `lang/en.json` — add label keys (Task 1).
- `src/helpers/svelte-components/tag/EditDeleteTag.svelte` — `<a>`→`<button>` + reset (Task 2).
- `src/helpers/svelte-components/button/IconButton.svelte` — required `label`, remove ignore (Task 3).
- `src/helpers/svelte-components/button/MiniIconButton.svelte` — forward `label` (Task 3).
- `src/document/svelte-components/DocumentOwnerIconButton.svelte` — forward `label` (Task 3).
- Direct `IconButton` consumers (Task 4): `CheckChatResetExpertiseButton.svelte`,
  `WeaponSheetSidebarAttacks.svelte`, `WeaponSheetAttackSettings.svelte`,
  `ItemSheetCheckSettings.svelte`, `SpellSheetSidebarCastingCheck.svelte`,
  `SpellSheetCustomAspectSettings.svelte`.
- Wrapper consumers (Task 5): `IntegerIncrementInput.svelte`, `CharacterSheetPortrait.svelte`,
  `CharacterSheetItemDeleteButton.svelte`, `ItemSheetRulesElementSettings.svelte`.
- Standalone aria-labels (Task 6): `ExpandButton.svelte`, `ActorSheetEditTokenButton.svelte`,
  `ActorSheetImportActorButton.svelte`, `ActorSheetToggleLinkedTokenButton.svelte`,
  `ActorSheetUnlinkTokenButton.svelte`, `ActorSheetUnlinkedTokenButton.svelte`,
  `ItemSheetSendToChatButton.svelte`, `ItemSheetImportItemButton.svelte`.
- Verification + tracker update (Task 7).

---

## Task 1: Add label keys to `lang/en.json`

**Files:**
- Modify: `lang/en.json`

**Reuse (already present — do NOT add):** `deleteItem`, `longRest`, `shortRest`,
`removeCombatEffects`, `spendResolve`, `sendToChat`.

- [ ] **Step 1: Add the new keys in correct alphabetical position**

`lang/en.json` is a flat map under `"LOCAL"` of `"<key>.text": "Value"` entries, sorted
alphabetically. Read the file and insert each of the following entries in its correct alphabetical
position (match the surrounding indentation — 6 spaces — and keep trailing commas valid):

```
"collapse.text": "Collapse",
"decrement.text": "Decrement",
"delete.text": "Delete",
"edit.text": "Edit",
"editToken.text": "Edit Token",
"expand.text": "Expand",
"importActor.text": "Import Actor to World",
"importItem.text": "Import Item to World",
"increment.text": "Increment",
"resetExpertise.text": "Reset Expertise",
"toggleTokenLink.text": "Toggle Token Link",
"tokenUnlinked.text": "Token Unlinked",
"unlinkToken.text": "Unlink Token",
```

- [ ] **Step 2: Verify JSON is still valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('lang/en.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Verify each new key is present exactly once**

Run: `grep -cE '"(collapse|decrement|delete|edit|editToken|expand|importActor|importItem|increment|resetExpertise|toggleTokenLink|tokenUnlinked|unlinkToken)\.text"' lang/en.json`
Expected: `13`

- [ ] **Step 4: Commit** (only if approved)

```bash
git add lang/en.json
git commit -m "i18n: add localized label keys for icon-button aria-labels"
```

---

## Task 2: `EditDeleteTag.svelte` — anchors → buttons

**Files:**
- Modify: `src/helpers/svelte-components/tag/EditDeleteTag.svelte`

- [ ] **Step 1: Add the localize import**

Ensure the `<script>` imports localize. After the existing
`import { DELETE_ICON, EDIT_ICON } from '~/system/Icons.js';` line, add:

```js
   import localize from '~/helpers/utility-functions/Localize.js';
```

- [ ] **Step 2: Replace the edit-icon anchor**

Find:

```svelte
   <!--Edit Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      aria-label="Edit"
      class={EDIT_ICON}
      onclick={() => {
         editFunction();
      }}
      onkeypress={() => {
         editFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction={editTooltip}
   ></a>
```

Replace with:

```svelte
   <!--Edit Icon-->
   <button
      type="button"
      aria-label={localize('edit')}
      class={EDIT_ICON}
      onclick={() => {
         editFunction();
      }}
      use:tooltipAction={editTooltip}
   ></button>
```

- [ ] **Step 3: Replace the delete-icon anchor**

Find:

```svelte
   <!--Delete Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      aria-label="Delete"
      class={DELETE_ICON}
      onclick={() => {
         deleteFunction();
      }}
      onkeypress={() => {
         deleteFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction={deleteTooltip}
   ></a>
```

Replace with:

```svelte
   <!--Delete Icon-->
   <button
      type="button"
      aria-label={localize('delete')}
      class={DELETE_ICON}
      onclick={() => {
         deleteFunction();
      }}
      use:tooltipAction={deleteTooltip}
   ></button>
```

- [ ] **Step 4: Add the chrome-reset style so the buttons render exactly like the old anchors**

Find:

```svelte
<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include separator-left;
      }
   }
</style>
```

Replace with:

```svelte
<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include separator-left;
      }

      // Reset native button chrome so the icon buttons render identically to the previous anchors.
      // font-family is intentionally NOT reset, so the FontAwesome glyph class keeps its font.
      button {
         appearance: none;
         background: none;
         border: none;
         margin: 0;
         padding: 0;
         color: inherit;
         font-size: inherit;
         font-weight: inherit;
         line-height: inherit;
         cursor: pointer;
      }
   }
</style>
```

- [ ] **Step 5: Verify the suppressions and anchors are gone**

Run: `grep -nE "svelte-ignore a11y|<a |role=\"button\"|onkeypress" src/helpers/svelte-components/tag/EditDeleteTag.svelte`
Expected: no output.

- [ ] **Step 6: Lint the file**

Run: `npx eslint src/helpers/svelte-components/tag/EditDeleteTag.svelte`
Expected: no errors and no a11y warnings (pre-existing unrelated warnings, if any, are acceptable).

Run: `npx stylelint "src/helpers/svelte-components/tag/EditDeleteTag.svelte"`
Expected: no output (clean).

- [ ] **Step 7: Commit** (only if approved)

```bash
git add src/helpers/svelte-components/tag/EditDeleteTag.svelte
git commit -m "a11y(svelte5): convert EditDeleteTag icons to buttons with localized labels"
```

---

## Task 3: `IconButton` required label + wrapper forwarding

**Files:**
- Modify: `src/helpers/svelte-components/button/IconButton.svelte`
- Modify: `src/helpers/svelte-components/button/MiniIconButton.svelte`
- Modify: `src/document/svelte-components/DocumentOwnerIconButton.svelte`

- [ ] **Step 1: Make `label` required in `IconButton.svelte` and update its typedef**

Find:

```svelte
    * @property {string | undefined} [label] - Accessible label for this icon-only button.
```

Replace with:

```svelte
    * @property {string} label - Accessible label for this icon-only button (required).
```

Then find:

```svelte
   const {
      icon = void 0,
      disabled = false,
      label = void 0,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

Replace with:

```svelte
   const {
      icon = void 0,
      disabled = false,
      label,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

- [ ] **Step 2: Remove the suppression in `IconButton.svelte`**

Find:

```svelte
<!-- svelte-ignore a11y_consider_explicit_label -->
<button
   aria-label={label}
```

Replace with:

```svelte
<button
   aria-label={label}
```

- [ ] **Step 3: Forward `label` in `MiniIconButton.svelte`**

Find:

```svelte
    * @property {((event: MouseEvent) => void) | undefined} onclick - Callback invoked when the button is clicked.
    */

   /** @type {MiniIconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

Replace with:

```svelte
    * @property {((event: MouseEvent) => void) | undefined} onclick - Callback invoked when the button is clicked.
    * @property {string} label - Accessible label, forwarded to the inner IconButton.
    */

   /** @type {MiniIconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      label,
   } = $props();
```

Then find:

```svelte
   <IconButton {disabled} {icon} {onclick} {tooltip}/>
```

Replace with:

```svelte
   <IconButton {disabled} {icon} {label} {onclick} {tooltip}/>
```

- [ ] **Step 4: Forward `label` in `DocumentOwnerIconButton.svelte`**

Find:

```svelte
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    */

   /** @type {DocumentOwnerIconButtonProps} */
   let {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

Replace with:

```svelte
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    * @property {string} label - Accessible label, forwarded to the inner IconButton.
    */

   /** @type {DocumentOwnerIconButtonProps} */
   let {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      label,
   } = $props();
```

Then find:

```svelte
<IconButton disabled={disabled || !document.data.isOwner} {icon} {onclick} {tooltip}/>
```

Replace with:

```svelte
<IconButton disabled={disabled || !document.data.isOwner} {icon} {label} {onclick} {tooltip}/>
```

- [ ] **Step 5: Verify the suppression is gone**

Run: `grep -n "a11y_consider_explicit_label" src/helpers/svelte-components/button/IconButton.svelte`
Expected: no output.

- [ ] **Step 6: Commit** (only if approved)

```bash
git add src/helpers/svelte-components/button/IconButton.svelte src/helpers/svelte-components/button/MiniIconButton.svelte src/document/svelte-components/DocumentOwnerIconButton.svelte
git commit -m "a11y(svelte5): require label on IconButton; forward through wrappers"
```

---

## Task 4: Label the direct `IconButton` consumers

For each file: ensure the localize import exists (see shared convention), then add a
`label={localize('<key>')}` prop to the specified `<IconButton>` (identified by its `icon` value and
`onclick` target). Add the prop on its own line, matching the surrounding indentation, immediately
after the `icon={…}` line.

**Files & exact label per `<IconButton>`:**

- [ ] **Step 1: `src/check/chat-message/CheckChatResetExpertiseButton.svelte`**
  - The `<IconButton icon={RESET_ICON} onclick={resetExpertise}/>` → add `label={localize('resetExpertise')}`.

- [ ] **Step 2: `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte`**
  - `<IconButton icon={EXPANDED_ICON} …>` (sets `isExpanded[idx] = false`) → add `label={localize('collapse')}`.
  - `<IconButton icon={COLLAPSED_ICON} …>` (sets `isExpanded[idx] = true`) → add `label={localize('expand')}`.

- [ ] **Step 3: `src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte`**
  - `<IconButton icon={EXPANDED_ICON} …>` → `label={localize('collapse')}`.
  - `<IconButton icon={COLLAPSED_ICON} …>` → `label={localize('expand')}`.
  - `<IconButton icon={DELETE_ICON} …>` (calls `deleteAttack`) → `label={localize('delete')}`.

- [ ] **Step 4: `src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte`**
  - `<IconButton icon={EXPANDED_ICON} …>` → `label={localize('collapse')}`.
  - `<IconButton icon={COLLAPSED_ICON} …>` → `label={localize('expand')}`.
  - `<IconButton icon={DELETE_ICON} …>` (calls `deleteCheck`) → `label={localize('delete')}`.

- [ ] **Step 5: `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte`** (already imports localize)
  - `<IconButton icon={EXPANDED_ICON} …>` → `label={localize('collapse')}`.
  - `<IconButton icon={COLLAPSED_ICON} …>` → `label={localize('expand')}`.

- [ ] **Step 6: `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte`**
  - `<IconButton icon={EXPANDED_ICON} …>` → `label={localize('collapse')}`.
  - `<IconButton icon={COLLAPSED_ICON} …>` → `label={localize('expand')}`.
  - `<IconButton icon={DELETE_ICON} …>` (calls `removeCustomAspect`) → `label={localize('delete')}`.

- [ ] **Step 7: Verify every direct `<IconButton>` in these files has a label**

Run: `npx eslint src/check/chat-message/CheckChatResetExpertiseButton.svelte src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte src/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte`
Expected: no errors (pre-existing unrelated warnings acceptable).

- [ ] **Step 8: Commit** (only if approved)

```bash
git add src/check/chat-message/CheckChatResetExpertiseButton.svelte "src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte" "src/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte" "src/document/types/item/sheet/check/ItemSheetCheckSettings.svelte" "src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte" "src/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte"
git commit -m "a11y(svelte5): localized labels on direct IconButton consumers"
```

---

## Task 5: Label the wrapper consumers

Same procedure (ensure localize import, add `label={localize('<key>')}` after the `icon={…}` line).

- [ ] **Step 1: `src/helpers/svelte-components/input/IntegerIncrementInput.svelte`**
  - `<MiniIconButton icon={DECREMENT_ICON} …>` → add `label={localize('decrement')}`.
  - `<MiniIconButton icon={INCREMENT_ICON} …>` → add `label={localize('increment')}`.

- [ ] **Step 2: `src/document/types/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte`**
  - `<DocumentOwnerIconButton icon={LONG_REST_ICON} …>` → `label={localize('longRest')}`.
  - `<DocumentOwnerIconButton icon={SHORT_REST_ICON} …>` → `label={localize('shortRest')}`.
  - `<DocumentOwnerIconButton icon={REMOVE_TEMP_EFFECTS_ICON} …>` → `label={localize('removeCombatEffects')}`.
  - `<DocumentOwnerIconButton icon={SPEND_RESOLVE_ICON} …>` → `label={localize('spendResolve')}`.

- [ ] **Step 3: `src/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte`** (already imports localize)
  - `<DocumentOwnerIconButton icon={DELETE_ICON} …>` → `label={localize('deleteItem')}`.

- [ ] **Step 4: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte`**
  - `<DocumentOwnerIconButton icon={DELETE_ICON} …>` → `label={localize('delete')}`.

- [ ] **Step 5: Lint the touched files**

Run: `npx eslint src/helpers/svelte-components/input/IntegerIncrementInput.svelte "src/document/types/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte" "src/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte" "src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte"`
Expected: no errors.

- [ ] **Step 6: Commit** (only if approved)

```bash
git add src/helpers/svelte-components/input/IntegerIncrementInput.svelte "src/document/types/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte" "src/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte" "src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte"
git commit -m "a11y(svelte5): localized labels on IconButton wrapper consumers"
```

---

## Task 6: Localize the standalone aria-labels

For each file: ensure the localize import exists, then replace the hardcoded English `aria-label`
with the `localize()` form below.

- [ ] **Step 1: `src/helpers/svelte-components/button/ExpandButton.svelte`**

Replace `   aria-label={expanded ? 'Collapse' : 'Expand'}` with
`   aria-label={expanded ? localize('collapse') : localize('expand')}`.

- [ ] **Step 2: `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte`**

Replace `<button aria-label="Edit Token"` with `<button aria-label={localize('editToken')}`.

- [ ] **Step 3: `src/document/types/actor/sheet/ActorSheetImportActorButton.svelte`**

Replace `<button aria-label="Import Actor to World"` with `<button aria-label={localize('importActor')}`.

- [ ] **Step 4: `src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte`**

Replace `<button aria-label="Toggle Token Link"` with `<button aria-label={localize('toggleTokenLink')}`.

- [ ] **Step 5: `src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte`**

Replace `<button aria-label="Unlink Token"` with `<button aria-label={localize('unlinkToken')}`.

- [ ] **Step 6: `src/document/types/actor/sheet/ActorSheetUnlinkedTokenButton.svelte`**

Replace `   <button aria-label="Token Unlinked" class="header-control icon" disabled={true}>` with
`   <button aria-label={localize('tokenUnlinked')} class="header-control icon" disabled={true}>`.

- [ ] **Step 7: `src/document/types/item/sheet/ItemSheetSendToChatButton.svelte`**

Replace `<button aria-label="Send to Chat"` with `<button aria-label={localize('sendToChat')}`.

- [ ] **Step 8: `src/document/types/item/sheet/ItemSheetImportItemButton.svelte`**

Replace `<button aria-label="Import Item to World"` with `<button aria-label={localize('importItem')}`.

- [ ] **Step 9: Lint the touched files**

Run: `npx eslint src/helpers/svelte-components/button/ExpandButton.svelte src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte src/document/types/actor/sheet/ActorSheetImportActorButton.svelte src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte src/document/types/actor/sheet/ActorSheetUnlinkedTokenButton.svelte src/document/types/item/sheet/ItemSheetSendToChatButton.svelte src/document/types/item/sheet/ItemSheetImportItemButton.svelte`
Expected: no errors.

- [ ] **Step 10: Commit** (only if approved)

```bash
git add src/helpers/svelte-components/button/ExpandButton.svelte src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte src/document/types/actor/sheet/ActorSheetImportActorButton.svelte src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte src/document/types/actor/sheet/ActorSheetUnlinkedTokenButton.svelte src/document/types/item/sheet/ItemSheetSendToChatButton.svelte src/document/types/item/sheet/ItemSheetImportItemButton.svelte
git commit -m "a11y(svelte5): localize standalone button aria-labels"
```

---

## Task 7: Full verification + tracker update

**Files:**
- Modify: `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`

- [ ] **Step 1: Full lint pass**

Run: `npm run eslint`
Expected: 0 errors (pre-existing JSDoc-style warnings acceptable). Investigate any NEW error in a
touched file before continuing.

Run: `npm run stylelint`
Expected: clean (no output).

- [ ] **Step 2: Assert no a11y suppressions remain in the two target components**

Run: `grep -rn "svelte-ignore a11y" src/helpers/svelte-components/tag/EditDeleteTag.svelte src/helpers/svelte-components/button/IconButton.svelte`
Expected: no output.

- [ ] **Step 3: Assert no hardcoded-English `aria-label` string literals remain in `src/`**

Run: `grep -rnE 'aria-label="[^"]' src/`
Expected: no output (every `aria-label` is now `{localize(...)}`, `{expr ? localize(...) : localize(...)}`, or `{label}`).

- [ ] **Step 4: Assert every IconButton-family usage carries a `label`**

List every file that uses one of the components:

Run: `grep -rlE "<(IconButton|MiniIconButton|DocumentOwnerIconButton)\b" src/`

Then, for each file in that list (excluding the three component definitions themselves —
`IconButton.svelte`, `MiniIconButton.svelte`, `DocumentOwnerIconButton.svelte`, which legitimately
contain the tag without a literal `label=` because they forward `{label}`), open the file and confirm
every `<IconButton>` / `<MiniIconButton>` / `<DocumentOwnerIconButton>` element includes a `label=`
prop. The known consumer set is fully covered by Tasks 4–5:
`CheckChatResetExpertiseButton`, `WeaponSheetSidebarAttacks`, `WeaponSheetAttackSettings`,
`ItemSheetCheckSettings`, `SpellSheetSidebarCastingCheck`, `SpellSheetCustomAspectSettings`,
`IntegerIncrementInput`, `CharacterSheetPortrait`, `CharacterSheetItemDeleteButton`,
`ItemSheetRulesElementSettings`. If grep reveals any consumer NOT in this list, add
`label={localize('<key>')}` to it (choosing the semantically correct key, adding a `lang/en.json`
entry per Task 1 if needed) and note it.

- [ ] **Step 5: Assert every introduced `localize('key')` has a matching lang key**

Run: `node -e "const fs=require('fs');const lang=JSON.parse(fs.readFileSync('lang/en.json','utf8')).LOCAL;const keys=['edit','delete','collapse','expand','resetExpertise','decrement','increment','longRest','shortRest','removeCombatEffects','spendResolve','deleteItem','editToken','importActor','toggleTokenLink','unlinkToken','tokenUnlinked','sendToChat','importItem'];const missing=keys.filter(k=>!(k+'.text' in lang));console.log(missing.length?('MISSING: '+missing.join(',')):'all present')"`
Expected: `all present`

- [ ] **Step 6: Visual verification in Foundry (the zero-visual-change gate)**

Launch the app (via the `run`/`verify` skill or the user's running instance) and confirm
pixel-identical rendering versus before the change for:
  - An item or weapon sheet showing a **custom-trait tag** (exercises the `EditDeleteTag` buttons —
    edit/delete icons, spacing, and the separator between them).
  - A sheet with **expand/collapse chevrons and a delete icon button** (weapon attacks or spell
    custom aspects).
  - The **+/- stepper** in any integer-increment input.
If `EditDeleteTag` shows any drift, switch its two buttons to the
`<button type="button" …><i class={EDIT_ICON|DELETE_ICON}></i></button>` form (glyph on a child `<i>`,
the button purely reset, mirroring `IconButton`), keeping the localized `aria-label`, and re-verify.
Report the result (and a screenshot/description) to the user for sign-off.

- [ ] **Step 7: Update the fixups tracker**

In `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`, under "Accepted debt", remove (or
mark resolved) the two now-fixed bullets — the `EditDeleteTag.svelte` anchors-as-buttons item and the
`IconButton.svelte` generic-icon-button item — noting they were resolved on 2026-05-30 (anchors →
buttons; `label` now required and supplied at all sites; all aria-labels localized).

- [ ] **Step 8: Commit** (only if approved)

```bash
git add docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md
git commit -m "docs(plan): mark EditDeleteTag/IconButton a11y debt resolved"
```

---

## Self-review notes (author)

- **Spec coverage:** lang keys (Task 1) ✓; EditDeleteTag anchors→buttons + reset + localized labels (Task 2) ✓; IconButton required label + remove suppression + wrapper forwarding (Task 3) ✓; direct consumer labels (Task 4) ✓; wrapper consumer labels (Task 5) ✓; standalone aria-label localization incl. ExpandButton (Task 6) ✓; ESLint/Stylelint/grep/JSON/visual verification + tracker update (Task 7) ✓. Out-of-scope items (state_referenced_locally, missing-declaration, foundry-vtt-types) intentionally untouched.
- **Placeholder scan:** No TBD/TODO. Step 4-of-Task-7's primary grep one-liner is fragile across shells, so an explicit manual fallback with the exhaustive known consumer list is provided — not a placeholder.
- **Consistency:** Label keys and `localize('<key>')` calls match the lang entries added in Task 1 (and the reused existing keys) exactly. `label` prop name, the `aria-label={label}` pattern, and the import path `~/helpers/utility-functions/Localize.js` are uniform across all tasks.
- **Known reused keys (not re-added):** deleteItem, longRest, shortRest, removeCombatEffects, spendResolve, sendToChat.
