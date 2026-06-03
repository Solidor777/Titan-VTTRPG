# Chat Message Subtypes — Phase 1 (Infrastructure + Checks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert TITAN's five check chat messages from `flags.titan` + a global render-hook switch into first-class Foundry v14 ChatMessage subtypes that store typed data in `message.system` and render their own Svelte component.

**Architecture:** A universal `TitanChatMessageDataModel` (extends the project `TitanDataModel`) is the base for every chat subtype; a `CheckChatMessageDataModel` family base holds the check schema, and five thin leaf models declare their Svelte component via `get component()`. `TitanChatMessage#renderHTML` calls `super.renderHTML()` for Foundry's standard card chrome, then mounts a thin `ChatMessageContent.svelte` (which renders `system.component`) into `.message-content`. The legacy `flags.titan` hook + `ChatMessageShell.svelte` switch remain untouched so unmigrated families (items/reports/effect) keep rendering during the phased rollout.

**Tech Stack:** Foundry VTT v14 (ApplicationV2, TypeDataModel, documentTypes/dataModels), pure Svelte 5 (runes, `mount`/`unmount`), Vite 8, Vitest (unit), Playwright (e2e).

---

## Conventions & ground rules

- **Source lives in `src/`; build output goes to the repo root.** Foundry loads the built output, so source edits require a build before they take effect in a launched world.
- **Style:** follow `.claude/CLAUDE.md` (120-col wrap, multi-line objects/arrays >1 entry, typed single-line var comments, multi-line function doc comments, no `:global` SCSS).
- **Delegation:** per project rules, the `.js`/`.svelte`/`.svelte.js` edits below are intended to be executed by the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.
- **e2e is world-launch-gated:** the Playwright suite runs against a *running* world the user has launched (per project memory, `/join` failures cause 6×60s login timeouts). Treat the full e2e run as a phase-end gate coordinated with the user, not a per-task loop.
- **Subtype registration needs a Foundry restart:** changes to `system.json` `documentTypes` only register after restarting Foundry. The world must be restarted after Task 4 before subtyped messages work.
- **Branch:** implement on a feature branch (e.g. `feat/chat-message-subtypes-phase1`). Intermediate commits transiently leave check rendering inconsistent until Task 5 lands; the phase is the unit of correctness.

Commands (from repo root):
- Build: `npm run build`
- e2e build: `npm run build:e2e`
- Unit tests: `npm test` (vitest run) — single file: `npx vitest run tests/unit/<file>`
- e2e: `npm run test:e2e` — single file: `npx playwright test tests/e2e/<file>`
- Lint: `npm run eslint` / styles: `npm run stylelint`

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/document/types/chat-message/ChatMessageDataModel.js` | Universal base `TitanChatMessageDataModel`; declares the `component` contract. |
| `src/document/types/chat-message/ChatMessageContent.svelte` | Thin content shell: sets `document` context, renders `system.component` (or the private-roll placeholder). |
| `src/check/chat-message/CheckChatMessageDataModel.js` | Check family base; defines the check schema (`parameters`, `results`, `failuresReRolled`, `message`). |
| `src/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js` | Attribute check leaf; `component` → `AttributeCheckChatMessage.svelte`. |
| `src/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js` | Resistance check leaf. |
| `src/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js` | Attack check leaf. |
| `src/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js` | Casting check leaf. |
| `src/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js` | Item check leaf. |
| `tests/components/StubChatMessage.svelte` | Minimal stub component used by the `ChatMessageContent` unit test. |
| `tests/unit/ChatMessageContent.test.js` | Unit test for the content shell's component selection. |

**Modified files**

| File | Change |
|---|---|
| `src/document/types/chat-message/ChatMessage.js` | Override `renderHTML` (self-render via `super` + mount) and add `_teardownComponent`. |
| `src/hooks/OnPreDeleteChatMessage.js` | Tear down via `message._teardownComponent()`. |
| `src/hooks/OnRenderChatMessageHTML.js` | Add an early-return guard for subtyped messages. |
| `src/hooks/OnceInit.js` | Register `CONFIG.ChatMessage.dataModels`. |
| `system.json` | Add five `documentTypes.ChatMessage` keys. |
| `lang/en.json` | Add the `TYPES.ChatMessage` block. |
| `src/check/Check.js` | `sendToChat` writes `type` + `system` instead of `flags.titan`. |
| `src/hooks/OnGetChatLogEntryContext.js` | Re-roll/double context menu reads/writes `message.system` for checks. |
| 19 `src/check/**` Svelte components | `document.data.flags.titan.X` → `document.data.system.X`; `message` guards → `.length`. |
| `tests/e2e/checkDialog.js` | `readNewestCheckFlags` reads `message.type` + `message.system.*`. |

`src/check/chat-message/RecalculateCheckResults.js` is **unchanged** — it is fed a `{ type, parameters, results }` object as before.

---

## Task 1: Chat message data models (base + check family + 5 leaves)

**Files:**
- Create: `src/document/types/chat-message/ChatMessageDataModel.js`
- Create: `src/check/chat-message/CheckChatMessageDataModel.js`
- Create: `src/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js`
- Create: `src/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js`
- Create: `src/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js`
- Create: `src/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js`
- Create: `src/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js`

These models require the live Foundry runtime (`TypeDataModel`, `data.fields`) which the unit-test env does not provide, so they are verified end-to-end in Task 6, not unit-tested.

- [ ] **Step 1: Create the universal base data model**

`src/document/types/chat-message/ChatMessageDataModel.js`:

```javascript
import TitanDataModel from '~/document/data-model/TitanDataModel.js';

/**
 * Universal base data model for all TITAN chat message subtypes. Provides the Svelte component
 * contract consumed by TitanChatMessage#renderHTML; concrete subtypes override component.
 * @extends {TitanDataModel}
 */
export default class TitanChatMessageDataModel extends TitanDataModel {
   /**
    * The Svelte component class used to render this chat message's content. Concrete subtypes must
    * override this getter.
    * @type {object}
    */
   get component() {
      throw new Error(`${this.constructor.name} must override the 'component' getter.`);
   }
}
```

- [ ] **Step 2: Create the check family base data model**

`src/check/chat-message/CheckChatMessageDataModel.js`:

```javascript
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createObjectField from '~/helpers/utility-functions/CreateObjectField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

/**
 * Shared data model for all check chat message subtypes. Stores the typed parameters and results
 * produced by the check engine, the re-roll flag, and any attached rich-text messages.
 * @extends {TitanChatMessageDataModel}
 */
export default class CheckChatMessageDataModel extends TitanChatMessageDataModel {
   /**
    * Defines the document schema for check chat messages, excluding component schemas.
    * @returns {object} The check chat message document schema.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         parameters: createObjectField(),
         results: createObjectField(),
         failuresReRolled: createBooleanField(false),
         message: createArrayField(createStringField()),
      };
   }
}
```

- [ ] **Step 3: Create the five leaf data models**

`src/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js`:

```javascript
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessage from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte';

/**
 * Data model for attribute check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class AttributeCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttributeCheckChatMessage;
   }
}
```

`src/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js`:

```javascript
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import ResistanceCheckChatMessage from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessage.svelte';

/**
 * Data model for resistance check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class ResistanceCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ResistanceCheckChatMessage;
   }
}
```

`src/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js`:

```javascript
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttackCheckChatMessage from '~/check/types/attack-check/chat-message/AttackCheckChatMessage.svelte';

/**
 * Data model for attack check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class AttackCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return AttackCheckChatMessage;
   }
}
```

`src/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js`:

```javascript
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import CastingCheckChatMessage from '~/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte';

/**
 * Data model for casting check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class CastingCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return CastingCheckChatMessage;
   }
}
```

`src/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js`:

```javascript
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import ItemCheckChatMessage from '~/check/types/item-check/chat-message/ItemCheckChatMessage.svelte';

/**
 * Data model for item check chat messages.
 * @extends {CheckChatMessageDataModel}
 */
export default class ItemCheckChatMessageDataModel extends CheckChatMessageDataModel {
   /**
    * The Svelte component used to render this chat message's content.
    * @type {object}
    */
   get component() {
      return ItemCheckChatMessage;
   }
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (these modules are not yet imported anywhere, so this only checks syntax/imports resolve).

- [ ] **Step 5: Commit**

```bash
git add src/document/types/chat-message/ChatMessageDataModel.js src/check/chat-message/CheckChatMessageDataModel.js src/check/types/*/chat-message/*ChatMessageDataModel.js
git commit -m "feat(chat): add chat-message subtype data models (base + 5 checks)"
```

---

## Task 2: Thin content shell `ChatMessageContent.svelte` (TDD)

**Files:**
- Create: `tests/components/StubChatMessage.svelte`
- Test: `tests/unit/ChatMessageContent.test.js`
- Create: `src/document/types/chat-message/ChatMessageContent.svelte`

- [ ] **Step 1: Create the stub component used by the test**

`tests/components/StubChatMessage.svelte`:

```svelte
<script>
   // Intentionally empty: a minimal placeholder rendered by the ChatMessageContent unit test.
</script>

<div data-testid="stub-chat-component">stub</div>
```

- [ ] **Step 2: Write the failing test**

`tests/unit/ChatMessageContent.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import StubChatMessage from '../components/StubChatMessage.svelte';

describe('ChatMessageContent', () => {
   beforeEach(() => {
      globalThis.game = { user: { isGM: true } };
   });

   afterEach(() => {
      delete globalThis.game;
   });

   it('renders the subtype component declared by system.component', () => {
      const documentStore = { data: { blind: false, system: { component: StubChatMessage } } };
      render(ChatMessageContent, { props: { documentStore } });
      expect(screen.getByTestId('stub-chat-component')).toBeTruthy();
   });

   it('renders nothing when no component is available', () => {
      const documentStore = { data: { blind: false, system: { component: undefined } } };
      const { container } = render(ChatMessageContent, { props: { documentStore } });
      expect(container.querySelector('[data-testid="stub-chat-component"]')).toBeNull();
   });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/unit/ChatMessageContent.test.js`
Expected: FAIL — cannot resolve `~/document/types/chat-message/ChatMessageContent.svelte` (not created yet).

- [ ] **Step 4: Create the content shell**

`src/document/types/chat-message/ChatMessageContent.svelte`:

```svelte
<script>
   import { getContext, setContext } from 'svelte';
   import PrivateRollChatMessage
      from '~/document/types/chat-message/components/messages/ChatMessagePrivateRollMessage.svelte';

   /** @type {object} The reactive Document store provided by TitanChatMessage#renderHTML. */
   const { documentStore = void 0 } = $props();

   // Expose the document to descendant components via context.
   setContext('document', documentStore);

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Selects the Svelte component to render. Non-GM viewers of a blind message see the private-roll
    * placeholder; everyone else sees the subtype's declared component.
    * @returns {object | undefined} The Svelte component class to render, if any.
    */
   function selectComponent() {
      if (game.user.isGM || !document.data.blind) {
         return document.data.system.component;
      }

      return PrivateRollChatMessage;
   }
</script>

{#if document.data}
   {@const SelectedComponent = selectComponent()}
   {#if SelectedComponent}
      <div>
         <SelectedComponent/>
      </div>
   {/if}
{/if}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/ChatMessageContent.test.js`
Expected: PASS (both cases).

- [ ] **Step 6: Commit**

```bash
git add src/document/types/chat-message/ChatMessageContent.svelte tests/components/StubChatMessage.svelte tests/unit/ChatMessageContent.test.js
git commit -m "feat(chat): add ChatMessageContent shell + unit test"
```

---

## Task 3: Document self-render + teardown + legacy-hook guard

**Files:**
- Modify: `src/document/types/chat-message/ChatMessage.js`
- Modify: `src/hooks/OnPreDeleteChatMessage.js`
- Modify: `src/hooks/OnRenderChatMessageHTML.js`

- [ ] **Step 1: Replace the `TitanChatMessage` stub with the self-rendering implementation**

Full new contents of `src/document/types/chat-message/ChatMessage.js`:

```javascript
import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import darkModeChatMessages from '~/helpers/Settings/DarkModeChatMessages.js';

/**
 * Extends the base Chat Message class so TITAN chat message subtypes render their own Svelte
 * component. Subtyped messages reuse Foundry's standard card chrome (via super.renderHTML) and mount
 * a Svelte component into the card's content region; all other messages render unchanged.
 * @extends {ChatMessage}
 */
export default class TitanChatMessage extends ChatMessage {
   /** @type {{ handle: object, bridge: ReactiveDocument } | undefined} The mounted Svelte component. */
   _svelteComponent = void 0;

   /**
    * Renders the chat message HTML. For TITAN subtypes, mounts the subtype's Svelte component into
    * the standard card content region.
    * @override
    * @param {object} [options] - Options forwarded to the base renderer.
    * @returns {Promise<HTMLElement>} The rendered chat message element.
    */
   async renderHTML(options) {
      // Build Foundry's standard card chrome (header, content region, controls).
      const html = await super.renderHTML(options);

      // Non-TITAN messages render unchanged.
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         return html;
      }

      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
      if (darkModeChatMessages() !== 'disabled') {
         html.classList.add('titan-dark-mode');
      }

      // Tear down any prior mount: the chat log replaces the element on every update.
      this._teardownComponent();

      // Mount the subtype's Svelte component into the card content region.
      const bridge = new ReactiveDocument(this);
      const handle = mount(ChatMessageContent, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });
      this._svelteComponent = { handle, bridge };

      return html;
   }

   /**
    * Unmounts the message's Svelte component and tears down its reactive bridge, if mounted.
    * @returns {void}
    */
   _teardownComponent() {
      if (this._svelteComponent?.handle) {
         unmount(this._svelteComponent.handle, { outro: false });
         this._svelteComponent.bridge?.destroy();
         this._svelteComponent = void 0;
      }
   }
}
```

- [ ] **Step 2: Simplify the delete-teardown hook**

Full new contents of `src/hooks/OnPreDeleteChatMessage.js`:

```javascript
/**
 * Tears down a TITAN chat message's mounted Svelte component when the message is deleted.
 * @param {ChatMessage} message - The Chat Message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   message?._teardownComponent?.();
}
```

Note: legacy `flags.titan` messages mounted by the old hook also store their handle on
`message._svelteComponent`, so `_teardownComponent()` cleans up both old and new messages uniformly.

- [ ] **Step 3: Guard the legacy render hook against subtyped messages**

In `src/hooks/OnRenderChatMessageHTML.js`, add the import after the existing imports (after line 5):

```javascript
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
```

Then add this guard as the **first statement** inside `onRenderChatMessageHTML` (before `const titanFlags = ...`):

```javascript
   // Subtyped TITAN messages render themselves via TitanChatMessage#renderHTML; skip them here.
   if (message?.system instanceof TitanChatMessageDataModel) {
      return;
   }
```

Leave the rest of the function (the `flags.titan` switch path for unmigrated families and the dark-mode-all branch) unchanged.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/chat-message/ChatMessage.js src/hooks/OnPreDeleteChatMessage.js src/hooks/OnRenderChatMessageHTML.js
git commit -m "feat(chat): self-render TITAN chat subtypes via document renderHTML"
```

---

## Task 4: Register the check subtypes

**Files:**
- Modify: `src/hooks/OnceInit.js`
- Modify: `system.json`
- Modify: `lang/en.json`

- [ ] **Step 1: Add the manifest subtypes**

In `system.json`, replace the empty ChatMessage entry:

```json
      "ChatMessage": {},
```

with:

```json
      "ChatMessage": {
         "attributeCheck": {},
         "resistanceCheck": {},
         "attackCheck": {},
         "castingCheck": {},
         "itemCheck": {}
      },
```

- [ ] **Step 2: Register the data models in OnceInit**

In `src/hooks/OnceInit.js`, add these imports alongside the other data-model imports near the top of the file:

```javascript
import AttributeCheckChatMessageDataModel from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import ResistanceCheckChatMessageDataModel from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js';
import AttackCheckChatMessageDataModel from '~/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js';
import CastingCheckChatMessageDataModel from '~/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js';
import ItemCheckChatMessageDataModel from '~/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js';
```

Then, directly after the existing line `CONFIG.ChatMessage.documentClass = TitanChatMessage;`, add:

```javascript
   CONFIG.ChatMessage.dataModels = {
      attributeCheck: AttributeCheckChatMessageDataModel,
      resistanceCheck: ResistanceCheckChatMessageDataModel,
      attackCheck: AttackCheckChatMessageDataModel,
      castingCheck: CastingCheckChatMessageDataModel,
      itemCheck: ItemCheckChatMessageDataModel,
   };
```

- [ ] **Step 3: Add localized type labels**

In `lang/en.json`, inside the `"TYPES"` object (which already contains `"Actor"`, `"Item"`, `"ActiveEffect"`), add a `"ChatMessage"` sibling key:

```json
      "ChatMessage": {
         "attributeCheck": "Attribute Check",
         "resistanceCheck": "Resistance Check",
         "attackCheck": "Attack Check",
         "castingCheck": "Casting Check",
         "itemCheck": "Item Check"
      },
```

- [ ] **Step 4: Verify build + localization guard**

Run: `npm run build`
Expected: build succeeds.

Run: `npx vitest run tests/unit/LocalizationKeys.test.js`
Expected: PASS (the new labels are plain strings, not `LOCAL.` keys).

- [ ] **Step 5: Commit**

```bash
git add system.json src/hooks/OnceInit.js lang/en.json
git commit -m "feat(chat): register check chat-message subtypes + type labels"
```

> After this task, restart Foundry so the new `documentTypes` register before manual or e2e verification.

---

## Task 5: Migrate producer, components, and the context menu to `system`

This task makes new check messages fully functional end-to-end; it is committed atomically so the working tree stays coherent.

**Files:**
- Modify: `src/check/Check.js`
- Modify: 19 Svelte components under `src/check/**` (see Step 2)
- Modify: `src/hooks/OnGetChatLogEntryContext.js`
- Modify: `tests/e2e/checkDialog.js`

- [ ] **Step 1: Migrate the check producer (`Check.js#sendToChat`)**

In `src/check/Check.js`, replace the body of `sendToChat` (currently lines ~186–219, from `const messageData = {` through the `ChatMessage.create(...)` return) with:

```javascript
   async sendToChat(options) {
      // Ensure the check is evaluated.
      if (!this.isEvaluated) {
         await this.evaluateCheck();
      }

      // Build the typed system data for the chat message.
      const system = {
         parameters: this.parameters,
         results: this.results,
         failuresReRolled: false,
      };

      // Add the messages if appropriate.
      if (options?.message) {
         system.message = options.message;
      }

      // Create and post the message as a typed check subtype.
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: game.user.id,
               type: this._getCheckType(),
               speaker: options?.speaker ?? ChatMessage.getSpeaker(),
               style: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.dice,
               system,
               classes: ['titan'],
            },
            game.settings.get('core', 'rollMode'),
         ),
      );
   }
```

Leave `_getCheckType()` and the rest of `Check.js` unchanged. (The five subclasses already return the matching subtype keys.)

- [ ] **Step 2: Sweep the 19 check components from `flags.titan` to `system`**

Apply this mechanical transformation in each file below:
- `document.data.flags.titan.X` → `document.data.system.X` (all reads).
- `document.data.update({ flags: { titan: { … } } })` → `document.data.update({ system: { … } })` (all writes).
- **Special case — the `message` array:** a guard `{#if document.data.flags.titan.message}` becomes `{#if document.data.system.message.length}` (the schema defaults `message` to `[]`, which is truthy, so guard on length to preserve "no empty section"). An iterator `{#each document.data.flags.titan.message as …}` becomes `{#each document.data.system.message as …}`.

Files (all under `src/check/`):
- `chat-message/CheckChatMessageDice.svelte`
- `chat-message/CheckChatMessageDie.svelte`
- `chat-message/CheckChatMessages.svelte` (`{#each … system.message …}`)
- `chat-message/CheckChatResults.svelte`
- `chat-message/CheckChatScalingAspects.svelte`
- `chat-message/CheckChatResetExpertiseButton.svelte` (check for an `update({ flags: { titan } })` write)
- `types/attribute-check/chat-message/AttributeCheckChatMessage.svelte` (`message` guard → `.length`; lines 20, 38, 41)
- `types/attribute-check/chat-message/AttributeCheckChatHeader.svelte`
- `types/resistance-check/chat-message/ResistanceCheckChatMessage.svelte`
- `types/resistance-check/chat-message/ResistanceCheckChatHeader.svelte`
- `types/attack-check/chat-message/AttackCheckChatMessage.svelte`
- `types/attack-check/chat-message/AttackCheckChatHeader.svelte`
- `types/attack-check/chat-message/AttackCheckChatStats.svelte`
- `types/casting-check/chat-message/CastingCheckChatMessage.svelte`
- `types/casting-check/chat-message/CastingCheckChatHeader.svelte`
- `types/casting-check/chat-message/CastingCheckChatMessageResistanceCheckButtons.svelte`
- `types/casting-check/chat-message/CastingCheckChatMessageScalingAspect.svelte`
- `types/item-check/chat-message/ItemCheckChatMessage.svelte`
- `types/item-check/chat-message/ItemCheckChatHeader.svelte`
- `types/item-check/chat-message/ItemCheckChatItemTraits.svelte`

Concrete example — `src/check/chat-message/CheckChatMessages.svelte` line 10:

```svelte
   {#each document.data.system.message as message}
```

Concrete example — `src/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte`:

```svelte
   <!--Chat Messages-->
   {#if document.data.system.message.length}
      <div class="section">
         <CheckChatMessages/>
      </div>
   {/if}
```
and
```svelte
   {#if document.data.system.results.damageTaken && game.user.isGM}
      <div class="section">
         <ChatDamageButtons
            damage={document.data.system.results.damageTaken}
         />
      </div>
   {/if}
```

- [ ] **Step 3: Migrate the re-roll / double context menu (`OnGetChatLogEntryContext.js`)**

Make these edits in `src/hooks/OnGetChatLogEntryContext.js`:

(a) Replace `getTitanFlags` (lines 88–109) with a check-data accessor that reads `system` for subtyped check messages:

```javascript
/**
 * Gets a plain check-data object ({ type, parameters, results, failuresReRolled, message }) for the
 * chat message under the given list item, or false when it is not an owned, visible check message.
 * @param {HTMLElement} li - The li HTMLElement for the Chat Message in the Chat Log.
 * @returns {object | false} The check data, or false.
 */
function getCheckData(li) {
   // Resolve the message via the v14 data-message-id attribute.
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);

   // Only owned, visible check messages expose these options.
   if (message?.isContentVisible
      && message.constructor.getSpeakerActor(message.speaker)?.isOwner
      && isCheck(message.type)
   ) {
      return { type: message.type, ...message.system.toObject() };
   }

   return false;
}
```

(b) In `canReRollFailures`, `canDoubleTraining`, and `canDoubleExpertise`, replace `getTitanFlags(li)` with `getCheckData(li)` and rename the local `titanFlags` to `checkData` (the property reads `.type`, `.failuresReRolled`, `.results.dice`, `.parameters.*` are unchanged).

(c) In `reRollFailures` (lines 142–198), replace the flag read and write:

Replace:
```javascript
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);
   const titanFlags = message?.flags?.titan;
```
with:
```javascript
   const message = game.messages.get(li.closest('[data-message-id]')?.dataset.messageId);
   const checkData = message.system.toObject();
```

Replace every remaining `titanFlags` reference in this function with `checkData`, and pass the type to the recalc:
```javascript
      const newResults = recalculateCheckResults(
         {
            type: message.type,
            parameters: checkData.parameters,
            results: checkData.results,
         },
      );
```

Replace the update:
```javascript
      await message.update({
         flags: {
            titan: {
               results: newResults,
               failuresReRolled: true,
            },
         },
      });
```
with:
```javascript
      await message.update({
         system: {
            results: newResults,
            failuresReRolled: true,
         },
      });
```

(d) In `doubleTraining` (lines 220–257) and `doubleExpertise` (lines 279–305), apply the same pattern: replace `const titanFlags = message?.flags?.titan;` with `const checkData = message.system.toObject();`, replace all `titanFlags` → `checkData`, and change each `message.update({ flags: { titan: structuredClone(checkData) } })` to:

```javascript
      await message.update({
         system: {
            parameters: checkData.parameters,
            results: checkData.results,
         },
      });
```

`src/check/chat-message/RecalculateCheckResults.js` is unchanged — it still receives `{ type, parameters, results }`.

- [ ] **Step 4: Update the e2e extractor to read the subtype + system**

In `tests/e2e/checkDialog.js`, replace the `page.evaluate` body inside `readNewestCheckFlags` (lines ~157–171) so it locates the newest check **subtype** message and reads `system`:

```javascript
         flags = await page.evaluate((base) => {
            // The five check subtypes created by the check engine.
            const checkTypes = ['attributeCheck', 'resistanceCheck', 'attackCheck', 'castingCheck', 'itemCheck'];

            // Only consider messages created after the baseline; return the newest check one.
            if (game.messages.size <= base) {
               return null;
            }
            const created = game.messages.contents.slice(base);
            const message = [...created].reverse().find((msg) => checkTypes.includes(msg?.type)) ?? null;
            return message
               ? {
                  type: message.type,
                  parameters: message.system.parameters,
                  results: message.system.results,
               }
               : null;
         }, baseline);
```

The returned shape (`{ type, parameters, results }`) is unchanged, so the specs that consume `readNewestCheckFlags` (`checks-dialog.spec.js`, `checks-integration.spec.js`) need no further edits.

- [ ] **Step 5: Discover and migrate any straggler check-flag consumers**

Run: `npx grep` is not available; use ripgrep via your editor or:
Run: `git grep -n "flags.titan" -- src/check src/hooks src/system`
Expected: the only remaining `flags.titan` references in check-related code are gone. Inspect any hit in `src/system/Macros.js` or elsewhere that reads a check message's `flags.titan.{type,parameters,results,failuresReRolled}` and migrate it to `message.type` / `message.system.*`. (Report/item/effect `flags.titan` usage is out of scope for Phase 1 and must remain.)

- [ ] **Step 6: Lint + build**

Run: `npm run eslint`
Expected: no new errors in touched files.

Run: `npm run stylelint`
Expected: no new errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/check/Check.js src/check/**/chat-message/*.svelte src/check/chat-message/*.svelte src/hooks/OnGetChatLogEntryContext.js tests/e2e/checkDialog.js
git commit -m "feat(chat): store check data in system; migrate components + context menu"
```

---

## Task 6: Phase verification gate (build + restart + full suites)

**Files:** none (verification only; commit any fixes uncovered).

- [ ] **Step 1: Unit suite**

Run: `npm test`
Expected: all unit tests pass, including the new `ChatMessageContent.test.js` and the existing `LocalizationKeys.test.js`.

- [ ] **Step 2: e2e build + restart**

Run: `npm run build:e2e`
Then **restart Foundry / relaunch the world** (required for the new `documentTypes` to register), and ensure the test world is launched (coordinate with the user — the e2e suite is world-launch-gated).

- [ ] **Step 3: Targeted check e2e first**

Run: `npx playwright test tests/e2e/checks-dialog.spec.js tests/e2e/checks-integration.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/effect-checks.spec.js`
Expected: PASS. These exercise all five check subtypes: the message is created with `message.type === '<leaf>'`, `message.system.parameters`/`results` are populated, dice plumb into `system.results.dice`, the card renders into the live log (root `.check-chat-message`), and attack damage buttons appear.

If any spec still references `flags.titan` directly (only comments are expected), update the assertion/comment to `message.type` / `message.system.*`.

- [ ] **Step 4: Manual smoke (with the user)**

In the launched world: roll each of the five checks; confirm each card renders, then right-click a check card and confirm **Re-Roll Failures**, **Double Expertise**, and **Double Training** appear (when applicable), execute correctly, and update the card in place. Delete a check card and confirm no console errors (clean unmount).

- [ ] **Step 5: Full e2e suite (regression)**

Run: `npm run test:e2e`
Expected: PASS at parity with the pre-change baseline. Item/report/effect chat messages still render via the legacy hook (coexistence intact).

- [ ] **Step 6: Commit any verification fixes**

```bash
git add -A
git commit -m "test(chat): green unit + e2e for check chat-message subtypes"
```

---

## Out of scope (later phases)

- Phase 2: item card subtypes (7). Phase 3: report subtypes (13). Phase 4: effect subtype + delete the legacy `OnRenderChatMessageHTML` mounting and `ChatMessageShell.svelte` switch + update the `titan-codebase` skill. The legacy path and `ChatMessageShell.svelte` MUST remain until Phase 4.

---

## Self-Review

**Spec coverage:**
- Per-leaf subtypes via inheritance → Task 1 (base + family + 5 leaves). ✓
- Universal `TitanChatMessageDataModel` base → Task 1 Step 1. ✓
- Typed `system` payload (ObjectField policy for `parameters`/`results`) → Task 1 Step 2. ✓
- Self-render via document `renderHTML` + `super` (the approved refinement over `system.renderHTML`) → Task 3 Step 1. ✓
- Thin content shell replacing the switch → Task 2. ✓
- Re-render + delete teardown → Task 3 Steps 1–2. ✓
- Legacy coexistence guard → Task 3 Step 3. ✓
- Registration (system.json + dataModels + lang) + restart note → Task 4. ✓
- Producer migration → Task 5 Step 1. ✓
- Component sweep incl. `message` `.length` guard → Task 5 Step 2. ✓
- Re-roll/double context-menu migration (cross-cutting, found during planning) → Task 5 Step 3. ✓
- Test extractor migration + e2e gate → Task 5 Step 4, Task 6. ✓
- "No legacy fallback for old messages" → enforced implicitly (old messages have no subtype → no `system.renderHTML` path; they fall through to standard render). The legacy switch stays only for the still-active item/report/effect families, removed in Phase 4. ✓

**Placeholder scan:** No TBD/TODO; every code step includes complete code. The component sweep lists all 19 files with an exact transformation rule and two concrete worked examples rather than 19 near-identical full-file rewrites (a deliberate, precise mechanical transform). Task 5 Step 5 is a real discovery+migration step with an exact grep, not a placeholder.

**Type/name consistency:** `TitanChatMessageDataModel` (base), `CheckChatMessageDataModel` (family), `<Check>ChatMessageDataModel` (leaves), `ChatMessageContent.svelte` (shell), `_svelteComponent`/`_teardownComponent` (document), `getCheckData`/`checkData` (context menu) are used consistently across tasks. Subtype keys (`attributeCheck`, `resistanceCheck`, `attackCheck`, `castingCheck`, `itemCheck`) match `_getCheckType()` returns, `system.json`, `CONFIG.ChatMessage.dataModels`, `lang` labels, `isCheck()`, and the e2e extractor's `checkTypes` list.
