# Restore Always-Visible Svelte Sheet Header Buttons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Delegation:** Per `.claude/CLAUDE.md`, every task that touches `.js` / `.svelte` / `.svelte.js` must be executed by the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.

**Goal:** Restore always-visible icon buttons (rendered as Svelte components, with rich HTML tippy tooltips) in the actor/item sheet window headers, and add a Send-to-Chat header button to the effect-subtype ActiveEffect sheet — all coexisting with the existing v14 `_getHeaderControls()` dropdown.

**Architecture:** `TitanDocumentSheet` gains generic header-mount machinery — a `_getHeaderButtonsComponent()` factory plus an `_onFirstRender` hook that `mount()`s the returned component into `.window-header` (anchored before the ⋮ button, sharing the `application` + `document` context), torn down in `_onClose`. This is the header twin of the existing content-shell mount. Each sheet category (actor/item/effect) supplies one reactive component that reuses existing click handlers.

**Tech Stack:** Foundry VTT v14 ApplicationV2 (`DocumentSheetV2`), pure Svelte 5 (runes) mounted via `mount()`/`unmount()`, tippy.js via the `tooltipAction` Svelte action, Vite build, Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-06-02-svelte-header-buttons-design.md`

---

## Reference: load-bearing facts (verified against source)

- AppV2 builds `.window-header` **only on first render** (`application.mjs:546`, guarded by `options.isFirstRender`); `render({ parts: [] })` does **not** rebuild it. So a header mount in `_onFirstRender` persists across re-renders, exactly like the content shell.
- `this.window.header` (the `.window-header` element) and `this.window.controls` (the ⋮ button) are reachable via the public `get window()` (`application.mjs:271`).
- `_onFirstRender` runs after both the frame and content exist (`application.mjs:547–586`).
- The current base `TitanDocumentSheet` mounts the content shell in `_replaceHTML` (first render only) and tears it down in `_onClose`; `#bridge` (the `ReactiveDocument`) is a private field.
- Existing helpers: `getApplication()` reads `getContext('application')`; the content shell sets `setContext('document', bridge)`. A header mount must therefore supply **both** `application` and `document` in its own context map.
- Icons (`src/system/Icons.js`): `EDIT_TOKEN_ICON='fas fa-user-circle'`, `IMPORT_ICON='fas fa-download'`, `LINKED_ICON='fas fa-link'`, `UNLINKED_ICON='fas fa-unlink'`, `SEND_TO_CHAT_ICON='fas fa-comment'`.
- Existing sheet methods to reuse (do NOT reimplement): `TitanActorSheet._onEditToken()`, `_onToggleTokenLink()`, `_onUnlinkToken()`, `_onImportActor()`, and the `get token()`; `TitanItemSheet._onImportItem()`; `item.sendToChat()`, `effect.sendToChat()`.
- Tooltip i18n contract (`conventions.md`): `tooltipAction` takes a **raw** key; `processTextData` resolves `<key>.text`. Existing keys present: `editLinkedToken.desc`, `editUnlinkedToken.desc`, `toggleTokenLinkedButton.desc`, `toggleTokenUnlinkedButton.desc`, `unlinkTokenButton.desc`, `unlinkedTokenButton.desc`, `importActorToWorld`, `importItemToWorld`. **Missing (added in Task 1):** `sendItemToChat.desc`, `sendEffectToChat.desc`.

## Commands

- Build: `npm run build`
- Lint JS: `npm run eslint` · Lint styles: `npm run stylelint`
- Unit tests: `npm test`
- E2E (user-gated — needs the launched world): `npm run build:e2e`, launch the world, then `npm run test:e2e -- header-buttons`

## File structure

**New**
- `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte` — actor header buttons (import / edit-token / link-state), reactive.
- `src/document/types/item/sheet/ItemSheetHeaderButtons.svelte` — item header buttons (send-to-chat / import).
- `src/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte` — effect send-to-chat button.
- `tests/e2e/header-buttons.spec.js` — e2e for the inline buttons.

**Modified**
- `src/document/sheet/TitanDocumentSheet.js` — `#headerMountHandle`, `_getHeaderButtonsComponent()`, `_onFirstRender`, `_onClose`.
- `src/document/types/actor/sheet/TitanActorSheet.js` — `_getHeaderButtonsComponent()`.
- `src/document/types/item/sheet/TitanItemSheet.js` — `_getHeaderButtonsComponent()`.
- `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js` — `_getHeaderButtonsComponent()`, new `_getHeaderControls()`.
- `lang/en.json` — two new tooltip keys.
- `.claude/skills/titan-codebase/references/conventions.md` — header-mount pattern note.
- `docs/TODO.md` — mark §7 complete.

---

## Task 1: Add the two missing tooltip i18n keys

**Files:**
- Modify: `lang/en.json`

- [ ] **Step 1: Locate the existing `sendToChat` key**

Run: `npm test` is not needed here. Find the anchor line:
```
grep -n '"sendToChat.text"' lang/en.json
```
Expected: one match (the existing Send-to-Chat label).

- [ ] **Step 2: Add the two rich-HTML tooltip keys**

Immediately after the `"sendToChat.text": ...,` line, add these two flat dotted keys (keep valid JSON — every line ends with a comma because more keys follow):

```json
      "sendItemToChat.desc.text": "<p>Display this <strong>Item</strong> in chat.</p>",
      "sendEffectToChat.desc.text": "<p>Display this <strong>Effect</strong> in chat.</p>",
```

- [ ] **Step 3: Verify the JSON parses and unit guard passes**

Run: `npm test`
Expected: PASS (including `tests/unit/LocalizationKeys.test.js`). A trailing-comma or duplicate-key mistake fails JSON parse / the localization guard.

- [ ] **Step 4: Commit**

```bash
git add lang/en.json
git commit -m "i18n: add sendItemToChat/sendEffectToChat header tooltip keys"
```

---

## Task 2: Add header-mount machinery to the base sheet

**Files:**
- Modify: `src/document/sheet/TitanDocumentSheet.js`

- [ ] **Step 1: Add the private handle field**

In the class body, beside the existing `#mountHandle` / `#bridge` fields, add:

```js
   /** @type {object | undefined} The mounted header-buttons Svelte component handle. */
   #headerMountHandle = void 0;
```

- [ ] **Step 2: Add the header-buttons factory**

Beside `_createReactiveState()`, add:

```js
   /**
    * Overridable factory for the always-visible header-buttons Svelte component mounted into the window
    * header. Subclasses return a component; the base mounts nothing.
    * @returns {import('svelte').Component | undefined} The header-buttons component, or undefined for none.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return void 0;
   }
```

- [ ] **Step 3: Mount the header buttons on first render**

Add this method (the frame and content both exist by `_onFirstRender`):

```js
   /**
    * Mount the always-visible header-buttons Svelte tree into the window header on first render. The
    * tree is anchored before the controls (ellipsis) button and shares the application and reactive
    * document via context, mirroring the content shell mount.
    * @override
    * @param {object} context - Prepared render context (unused).
    * @param {object} options - Render options.
    * @returns {Promise<void>} Resolves once the header tree is mounted.
    * @protected
    */
   async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);

      // The per-type header-buttons component, if any.
      const headerButtons = this._getHeaderButtonsComponent();
      if (headerButtons) {
         this.#headerMountHandle = mount(headerButtons, {
            target: this.window.header,
            anchor: this.window.controls,
            context: new Map([
               ['application', this],
               ['document', this.#bridge],
            ]),
         });
      }
   }
```

- [ ] **Step 4: Unmount the header buttons on close**

Replace the existing `_onClose` body so it also tears down the header tree (order: content, header, then bridge):

```js
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
      if (this.#headerMountHandle) {
         unmount(this.#headerMountHandle, { outro: true });
         this.#headerMountHandle = void 0;
      }
      this.#bridge?.destroy();
   }
```

- [ ] **Step 5: Build and lint**

Run: `npm run build && npm run eslint`
Expected: build succeeds; no new eslint errors. (No behaviour change yet — no subclass returns a component.)

- [ ] **Step 6: Commit**

```bash
git add src/document/sheet/TitanDocumentSheet.js
git commit -m "feat(sheet): add header-buttons Svelte mount machinery to TitanDocumentSheet"
```

---

## Task 3: Actor header-buttons component + wiring

**Files:**
- Create: `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte`
- Modify: `src/document/types/actor/sheet/TitanActorSheet.js`

- [ ] **Step 1: Create the actor header-buttons component**

```svelte
<script>
   import { getContext } from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { EDIT_TOKEN_ICON, IMPORT_ICON, LINKED_ICON, UNLINKED_ICON } from '~/system/Icons.js';

   /** @type {object} The reactive Document bridge shared via context. */
   const document = getContext('document');

   /** @type {import('./TitanActorSheet.js').default} The owning Actor sheet. */
   const application = getApplication();

   /** @type {TokenDocument | null} The active Token, or null for a directory Actor. Stable per sheet. */
   const token = application.token;

   /** @type {boolean} Whether the active user may configure this Actor's tokens. */
   const canEditToken = game.user.isGM || (application.actor.isOwner && game.user.can('TOKEN_CONFIGURE'));

   /** @type {boolean} Whether the active user may import this Actor from its compendium pack. */
   const canImport = game.user.isGM && !!application.actor.pack;
</script>

{#if canImport}
   <!-- Import Actor -->
   <button aria-label={localize('importActor')}
           class="header-control icon titan-header-button import-actor-button"
           onclick={() => application._onImportActor()}
           use:tooltipAction={'importActorToWorld'}
   >
      <i class={IMPORT_ICON}></i>
   </button>
{/if}

{#if canEditToken}
   <!-- Edit Token: tooltip reflects whether edits affect linked instances -->
   <button aria-label={localize('editToken')}
           class="header-control icon titan-header-button edit-token-button"
           onclick={() => application._onEditToken()}
           use:tooltipAction={
              (token?.actorLink || (token === null && document.data.prototypeToken?.actorLink))
                 ? 'editLinkedToken.desc'
                 : 'editUnlinkedToken.desc'
           }
   >
      <i class={EDIT_TOKEN_ICON}></i>
   </button>

   {#if token === null}
      <!-- Directory Actor: toggle the prototype token link (reactive icon + tooltip + glow) -->
      <button aria-label={localize('toggleTokenLink')}
              class="header-control icon titan-header-button toggle-token-linked-button"
              onclick={() => application._onToggleTokenLink()}
              use:tooltipAction={
                 document.data.prototypeToken?.actorLink
                    ? 'toggleTokenUnlinkedButton.desc'
                    : 'toggleTokenLinkedButton.desc'
              }
      >
         <i
            class={document.data.prototypeToken?.actorLink
               ? `linked ${LINKED_ICON}`
               : `unlinked ${UNLINKED_ICON}`}
         ></i>
      </button>
   {:else if token.actorLink === true}
      <!-- Placed, linked Token: irreversible unlink -->
      <button aria-label={localize('unlinkToken')}
              class="header-control icon titan-header-button unlink-token-button"
              onclick={() => application._onUnlinkToken()}
              use:tooltipAction={'unlinkTokenButton.desc'}
      >
         <i class="linked {LINKED_ICON}"></i>
      </button>
   {:else}
      <!-- Placed, already-unlinked Token: informational (disabled) -->
      <div class="inactive-button" use:tooltipAction={'unlinkedTokenButton.desc'}>
         <button aria-label={localize('tokenUnlinked')}
                 class="header-control icon titan-header-button unlinked-token-button"
                 disabled={true}
         >
            <i class="unlinked {UNLINKED_ICON}"></i>
         </button>
      </div>
   {/if}
{/if}

<style lang="scss">
   .linked {
      color: darkorange;
      text-shadow: 0 0 8px darkorange;
   }

   .unlinked {
      color: brown;
      text-shadow: 0 0 8px brown;
   }

   .inactive-button {
      cursor: not-allowed;
   }
</style>
```

- [ ] **Step 2: Wire the component into `TitanActorSheet`**

Add the import at the top of `src/document/types/actor/sheet/TitanActorSheet.js`:

```js
import ActorSheetHeaderButtons from '~/document/types/actor/sheet/ActorSheetHeaderButtons.svelte';
```

Add this method to the class (e.g. after `_getTokenLinkControl`):

```js
   /**
    * Supply the always-visible actor header-buttons component for the window header.
    * @override
    * @returns {import('svelte').Component} The actor header-buttons component.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return ActorSheetHeaderButtons;
   }
```

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run eslint && npm run stylelint`
Expected: build + lints pass.

- [ ] **Step 4: Manual smoke (optional, if the world is running)**

Open a directory player actor's sheet → the Import (GM+pack only), Edit Token, and Toggle Link icons appear inline in the title bar, left of the ⋮; hovering shows the rich HTML tooltips; the Toggle Link icon glows orange (linked) / brown (unlinked).

- [ ] **Step 5: Commit**

```bash
git add src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte src/document/types/actor/sheet/TitanActorSheet.js
git commit -m "feat(actor-sheet): restore always-visible Svelte header buttons"
```

---

## Task 4: Item header-buttons component + wiring

**Files:**
- Create: `src/document/types/item/sheet/ItemSheetHeaderButtons.svelte`
- Modify: `src/document/types/item/sheet/TitanItemSheet.js`

- [ ] **Step 1: Create the item header-buttons component**

```svelte
<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { IMPORT_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /** @type {import('./TitanItemSheet.js').default} The owning Item sheet. */
   const application = getApplication();

   /** @type {boolean} Whether this Item can be imported from its compendium pack. */
   const canImport = !!application.item.pack;
</script>

<!-- Send to Chat -->
<button aria-label={localize('sendToChat')}
        class="header-control icon titan-header-button send-to-chat-button"
        onclick={() => application.item.sendToChat()}
        use:tooltipAction={'sendItemToChat.desc'}
>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>

{#if canImport}
   <!-- Import Item -->
   <button aria-label={localize('importItem')}
           class="header-control icon titan-header-button import-item-button"
           onclick={() => application._onImportItem()}
           use:tooltipAction={'importItemToWorld'}
   >
      <i class={IMPORT_ICON}></i>
   </button>
{/if}
```

- [ ] **Step 2: Wire the component into `TitanItemSheet`**

Add the import at the top of `src/document/types/item/sheet/TitanItemSheet.js`:

```js
import ItemSheetHeaderButtons from '~/document/types/item/sheet/ItemSheetHeaderButtons.svelte';
```

Add this method to the class (e.g. after `_getHeaderControls`):

```js
   /**
    * Supply the always-visible item header-buttons component for the window header.
    * @override
    * @returns {import('svelte').Component} The item header-buttons component.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return ItemSheetHeaderButtons;
   }
```

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run eslint && npm run stylelint`
Expected: build + lints pass.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/sheet/ItemSheetHeaderButtons.svelte src/document/types/item/sheet/TitanItemSheet.js
git commit -m "feat(item-sheet): restore always-visible Svelte header buttons (fix send-to-chat tooltip)"
```

---

## Task 5: Effect header-buttons component + wiring + dropdown coexistence

**Files:**
- Create: `src/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte`
- Modify: `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`

- [ ] **Step 1: Create the effect header-buttons component**

```svelte
<script>
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /** @type {import('./TitanActiveEffectSheet.js').default} The owning Active Effect sheet. */
   const application = getApplication();
</script>

<!-- Send to Chat -->
<button aria-label={localize('sendToChat')}
        class="header-control icon titan-header-button send-to-chat-button"
        onclick={() => application.effect.sendToChat()}
        use:tooltipAction={'sendEffectToChat.desc'}
>
   <i class={SEND_TO_CHAT_ICON}></i>
</button>
```

- [ ] **Step 2: Wire the component and add the dropdown control**

In `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`, add imports at the top:

```js
import ActiveEffectSheetHeaderButtons from '~/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte';
import localize from '~/helpers/utility-functions/Localize.js';
import { SEND_TO_CHAT_ICON } from '~/system/Icons.js';
```

Add both methods to the class (e.g. after `_createReactiveState`):

```js
   /**
    * Supply the always-visible effect header-buttons component for the window header.
    * @override
    * @returns {import('svelte').Component} The effect header-buttons component.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return ActiveEffectSheetHeaderButtons;
   }

   /**
    * Build the native AppV2 header controls for this Active Effect sheet, adding a Send-to-Chat entry
    * so the action is reachable from the controls dropdown as well as the inline header button.
    * @override
    * @returns {ApplicationHeaderControlsEntry[]} The header control entries to render.
    * @protected
    */
   _getHeaderControls() {
      /** @type {ApplicationHeaderControlsEntry[]} The accumulated control entries. */
      const controls = super._getHeaderControls();

      // Send to Chat control: posts this Active Effect to chat.
      controls.push({
         action: 'titanSendEffectToChat',
         icon: SEND_TO_CHAT_ICON,
         label: localize('sendToChat'),
         onClick: () => this.effect.sendToChat(),
      });

      return controls;
   }
```

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run eslint && npm run stylelint`
Expected: build + lints pass.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte src/document/types/active-effect/sheet/TitanActiveEffectSheet.js
git commit -m "feat(effect-sheet): add Send-to-Chat header button (inline + dropdown)"
```

---

## Task 6: E2E coverage

**Files:**
- Create: `tests/e2e/header-buttons.spec.js`

- [ ] **Step 1: Write the e2e spec**

```js
import { test, expect } from '@playwright/test';
import { ensureDocument, login } from './fixtures.js';

/**
 * Render a document's sheet inside the Foundry runtime and return a locator for its frame element.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} locateSrc - Stringified locator function body returning the document.
 * @param {string} sheetClass - A CSS class the rendered sheet frame exposes (without the dot).
 * @returns {Promise<import('@playwright/test').Locator>} Locator for the sheet frame element.
 */
async function renderSheetFrame(page, locateSrc, sheetClass) {
   // Render the sheet inside the world and capture its application id.
   const appId = await page.evaluate(async (src) => {
      const doc = new Function(`return (${src})()`)();
      if (!doc) {
         return null;
      }
      const app = await doc.sheet.render(true);
      await new Promise((resolve) => {
         setTimeout(resolve, 500);
      });
      return app.id;
   }, locateSrc);

   // The fixture and its rendered sheet must exist.
   expect(appId, 'document fixture not found in world').not.toBeNull();
   const sheet = page.locator(`[id="${appId}"]`);
   await expect(sheet).toBeVisible();
   await expect(sheet).toHaveClass(new RegExp(sheetClass));
   return sheet;
}

test.describe('always-visible Svelte header buttons', () => {
   // Log in before every test so a single failure never poisons the rest.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // The actor sheet shows inline Edit Token + Toggle Link buttons without opening the dropdown.
   test('actor sheet shows inline header buttons', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Header Player');
      const sheet = await renderSheetFrame(page, locate, 'titan-player-sheet');

      await expect(sheet.locator('.window-header .edit-token-button')).toBeVisible();
      await expect(sheet.locator('.window-header .toggle-token-linked-button')).toBeVisible();
   });

   // The Toggle Link button's icon reacts to the prototype token link state via the document bridge.
   test('actor toggle-link button reacts to prototype link state', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Header Player');
      const sheet = await renderSheetFrame(page, locate, 'titan-player-sheet');
      const icon = sheet.locator('.window-header .toggle-token-linked-button i');

      // Force the unlinked state, then flip to linked; the icon class must follow.
      await page.evaluate((src) => {
         const doc = new Function(`return (${src})()`)();
         return doc.prototypeToken.update({ actorLink: false });
      }, locate);
      await expect(icon).toHaveClass(/(?:^|\s)unlinked(?:\s|$)/);

      await page.evaluate((src) => {
         const doc = new Function(`return (${src})()`)();
         return doc.prototypeToken.update({ actorLink: true });
      }, locate);
      await expect(icon).toHaveClass(/(?:^|\s)linked(?:\s|$)/);
   });

   // The item sheet's inline Send-to-Chat button posts a chat message.
   test('item send-to-chat header button posts a message', async ({ page }) => {
      const locate = await ensureDocument(page, 'Item', 'weapon', 'E2E Header Weapon');
      const sheet = await renderSheetFrame(page, locate, 'titan-item-sheet');

      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      const baseline = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect
         .poll(() => page.evaluate(() => game.messages.size))
         .toBeGreaterThan(baseline);
   });

   // The effect-subtype ActiveEffect sheet's inline Send-to-Chat button posts a chat message.
   test('effect send-to-chat header button posts a message', async ({ page }) => {
      // Create an effect-subtype ActiveEffect on a player actor and render its sheet.
      const appId = await page.evaluate(async () => {
         const actor = game.actors.find((a) => a.type === 'player')
            ?? await Actor.create({ name: 'E2E Header Effect Host', type: 'player' });
         let effect = actor.effects.find((e) => e.type === 'effect' && e.name === 'E2E Header Effect');
         if (!effect) {
            const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
               { name: 'E2E Header Effect', type: 'effect' },
            ]);
            effect = created;
         }
         const app = await effect.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
         return app.id;
      });

      const sheet = page.locator(`[id="${appId}"]`);
      await expect(sheet).toHaveClass(/titan-effect-sheet/);

      const sendToChat = sheet.locator('.window-header .send-to-chat-button');
      await expect(sendToChat).toBeVisible();

      const baseline = await page.evaluate(() => game.messages.size);
      await sendToChat.click();
      await expect
         .poll(() => page.evaluate(() => game.messages.size))
         .toBeGreaterThan(baseline);
   });
});
```

- [ ] **Step 2: Build the e2e bundle**

Run: `npm run build:e2e`
Expected: build succeeds.

- [ ] **Step 3: Run the e2e (user-gated — requires the launched world)**

Run (with the world running): `npm run test:e2e -- header-buttons`
Expected: 4 passing. The existing `header-controls.spec.js` (dropdown) must still pass:
Run: `npm run test:e2e -- header-controls`
Expected: 2 passing (coexistence intact).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/header-buttons.spec.js
git commit -m "test(e2e): cover always-visible Svelte header buttons (actor/item/effect)"
```

---

## Task 7: Docs and skill self-update

**Files:**
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update the conventions header-controls note**

In `.claude/skills/titan-codebase/references/conventions.md`, find the sentence in the "AppV2 header controls" note reading "`_renderHeaderControl` is unused in v14 core; inline buttons would require `_getFrameButtons`)." Replace the parenthetical with a pointer to the actual pattern:

```
(`_renderHeaderControl` is unused in v14 core. TITAN renders always-visible inline header buttons
as Svelte instead: `TitanDocumentSheet._onFirstRender` mounts the component from
`_getHeaderButtonsComponent()` into `this.window.header`, anchored at `this.window.controls`, with a
context map providing `application` + the `document` bridge; `_onClose` unmounts it. The frame is
built once on first render, so the header mount survives `render({ parts: [] })`. See
`ActorSheetHeaderButtons.svelte` / `ItemSheetHeaderButtons.svelte` /
`ActiveEffectSheetHeaderButtons.svelte`. These COEXIST with the `_getHeaderControls()` dropdown.)
```

- [ ] **Step 2: Mark backlog §7 complete**

In `docs/TODO.md`, under "### 7. Rich (TyphonJS-style) sheet header buttons", change the status to DONE and summarize: always-visible Svelte header buttons restored on actor/item sheets (rich `.desc` tippy tooltips, reactive token link/unlink with orange/brown glow) plus a new Send-to-Chat header button on the effect-subtype ActiveEffect sheet (inline + dropdown), coexisting with the v14 `_getHeaderControls()` dropdown. Reference the spec/plan paths and the new `header-buttons.spec.js`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/titan-codebase/references/conventions.md docs/TODO.md
git commit -m "docs: record Svelte header-button pattern; mark backlog #7 done"
```

---

## Final verification

- [ ] `npm run build` — succeeds.
- [ ] `npm run eslint && npm run stylelint` — clean.
- [ ] `npm test` — unit suite green (i18n guard included).
- [ ] `npm run build:e2e` then, with the world running, `npm run test:e2e -- "header-buttons|header-controls"` — all green (new inline coverage + existing dropdown coverage).
- [ ] Manual: actor / item / effect sheets show the inline buttons left of the ⋮, with rich hover tooltips; the actor link/unlink button glows and updates on toggle; clicking Send-to-Chat (item + effect) posts a card.

---

## Self-review (completed during authoring)

- **Spec coverage:** base machinery (Task 2) ✓; actor buttons incl. reactive link/unlink + glow (Task 3) ✓; item buttons + send-to-chat tooltip-bug fix (Task 4) ✓; effect send-to-chat inline + dropdown coexistence (Task 5) ✓; two new i18n keys (Task 1) ✓; e2e for all three categories + dropdown-coexistence check (Task 6) ✓; conventions.md + TODO.md (Task 7) ✓. Non-goals (no effect Import, no condition buttons, dropdown untouched) honored.
- **Placeholder scan:** none — every code step shows complete content.
- **Type/name consistency:** `_getHeaderButtonsComponent()` defined in Task 2 and overridden identically in Tasks 3/4/5; `#headerMountHandle` used consistently; tooltip keys added in Task 1 (`sendItemToChat.desc` / `sendEffectToChat.desc`) match their consumers in Tasks 4/5; reused methods (`_onEditToken`, `_onToggleTokenLink`, `_onUnlinkToken`, `_onImportActor`, `_onImportItem`, `sendToChat`) all verified to exist; button CSS classes (`edit-token-button`, `toggle-token-linked-button`, `send-to-chat-button`) match the e2e selectors in Task 6.
