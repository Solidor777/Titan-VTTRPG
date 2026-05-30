# Svelte 5 Migration — Phase 1: Foundation Cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all `@typhonjs-fvtt/runtime` usage and stand TITAN up on pure Svelte 5 + Foundry v14 ApplicationV2, leaving all 417 leaf components working unchanged in Svelte 5 legacy mode via a temporary store-compat bridge.

**Architecture:** A reusable `ReactiveDocument` bridge replaces `TJSDocument` and exposes BOTH `.data` (runes, end-state) and a `subscribe`/`destroy` store shim (so legacy `$document` readers keep working). The sheet base becomes `DocumentSheetV2` and mounts a Svelte 5 root shell via `mount()`/`unmount()` into the AppV2 content element. The chat mount and dialog base move from the Svelte-4 imperative API (`new Component()`, `$destroy`) and `TJSDialog` to `mount()`/`unmount()` and a Svelte-mounting `ApplicationV2`. `TJSProseMirror` becomes a wrapper around Foundry's native `<prose-mirror>` element; the one `slideFade` transition becomes the built-in `slide`.

**Tech Stack:** Foundry v14, Svelte 5 (runes + legacy mode), `@sveltejs/vite-plugin-svelte` ^4, Vite 5, `svelte-preprocess`, SCSS.

**Working tree:** `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan` on branch `feature/svelte5-migration`.

**Spec:** `docs/superpowers/specs/2026-05-29-svelte5-migration-design.md`.

---

## Verification model (read before starting)

TITAN has **no unit-test runner**. "Tests" in this plan are:

- **Build:** `npm run build` must complete without error (the green-build gate).
- **Lint:** `npm run eslint`.
- **Behavioral:** launch the v14 dev world and observe specific UI behavior. Launch with:
  `cd C:\FoundryVTT\V14\dev` then `node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata`.

This is an **atomic cutover**: an intermediate red build is expected between Tasks 4–12. The build must be green by Task 13. Commit each task even if the build is still red (it's an isolated branch) — commits are checkpoints, not release gates.

---

## File Structure

**Created:**
- `src/document/reactive/ReactiveDocument.svelte.js` — the reactivity bridge + store-compat shim.
- `src/helpers/svelte-components/editor/ProseMirrorEditor.svelte` — native `<prose-mirror>` wrapper.

**Modified (TyphonJS removed):**
- `package.json` — Svelte 5 deps, drop TyphonJS deps + `#runtime`/`#standard` import maps.
- `vite.config.mjs` — drop `@typhonjs-fvtt/runtime/rollup`; standalone PostCSS.
- `system.json` — compatibility → v14.
- `src/document/sheet/TitanDocumentSheet.js` — `SvelteApplication` → `DocumentSheetV2`.
- `src/document/sheet/DocumentSheetShell.svelte` — drop `ApplicationShell`; Svelte 5 root content shell.
- `src/hooks/OnRenderChatMessageHTML.js` — `new ChatMessageShell()` → `mount()`; `TJSDocument` → `ReactiveDocument`.
- `src/hooks/OnPreDeleteChatMessage.js` — `$destroy` → `unmount()`.
- `src/helpers/dialogs/Dialog.js` — `TJSDialog` → Svelte-mounting `ApplicationV2`.
- `src/document/svelte-components/input/DocumentEditorInput.svelte` — `TJSProseMirror` → wrapper.
- `src/document/svelte-components/input/DocumentBoundEditorInput.svelte` — `TJSProseMirror` → wrapper.
- `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte` — `slideFade` → `slide`.

**Deleted:**
- `src/document/sheet/ConfigureSheetButton.svelte` — redundant; `DocumentSheetV2` provides a configure-sheet control.

**Untouched in Phase 1 (deferred to later phases):** all ~14 per-type sheet classes, all ~5 check-dialog classes, and all 417 leaf `.svelte` components (they run in legacy mode via the shim).

---

### Task 1: Swap dependencies to Svelte 5

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit `package.json` dependencies**

Remove the three TyphonJS dependencies and the `imports` map; move `svelte`/`@sveltejs/vite-plugin-svelte` to current. Final `imports`, `dependencies`, and the two relevant `devDependencies` lines:

```jsonc
// DELETE this top-level block entirely:
//   "imports": {
//      "#runtime/*": "@typhonjs-fvtt/runtime/*",
//      "#standard/*": "@typhonjs-fvtt/svelte-standard/*"
//   },

// In "dependencies", DELETE these three lines:
//   "@typhonjs-fvtt/runtime": "^0.3.0-next.4",
//   "@typhonjs-fvtt/standard": "^0.3.0-next.4",
// and move "@sveltejs/vite-plugin-svelte" to devDependencies as ^4 (see below).

// "devDependencies" — set these two:
"@sveltejs/vite-plugin-svelte": "^4.0.0",
"svelte": "^5.0.0",
```

Note: `@sveltejs/vite-plugin-svelte` ^4 is the line compatible with both Svelte 5 and the project's Vite 5. Keep `svelte-preprocess`, `vite ^5`, and all lint deps as-is.

- [ ] **Step 2: Reinstall**

Run: `npm install`
Expected: completes; `@typhonjs-fvtt/*` gone from the tree.

- [ ] **Step 3: Verify versions**

Run: `npm ls svelte @sveltejs/vite-plugin-svelte`
Expected: `svelte@5.x.x` and `@sveltejs/vite-plugin-svelte@4.x.x`; no TyphonJS packages.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: move to Svelte 5, drop TyphonJS runtime deps"
```

---

### Task 2: Standalone PostCSS in Vite config

**Files:**
- Modify: `vite.config.mjs`

The current config imports `postcssConfig`/`terserConfig` from `@typhonjs-fvtt/runtime/rollup`, which no longer exists. Replace with a direct PostCSS config (autoprefixer). Compression is off (`s_COMPRESS = false`), so terser is unused at runtime.

- [ ] **Step 1: Remove the TyphonJS rollup import**

Delete this line:
```js
import { postcssConfig, terserConfig } from '@typhonjs-fvtt/runtime/rollup';
```

- [ ] **Step 2: Replace the `css.postcss` value**

Change:
```js
postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS }),
```
to:
```js
postcss: {
   plugins: [autoprefixer()],
},
```
(`autoprefixer` is already imported at the top of the file.)

- [ ] **Step 3: Replace the terser branch in `build`**

Change:
```js
terserOptions: s_COMPRESS ? { ...terserConfig(), ecma: 2022 } : void 0,
```
to:
```js
terserOptions: s_COMPRESS ? { ecma: 2022 } : void 0,
```

- [ ] **Step 4: Verify the config parses**

Run: `node --check vite.config.mjs`
Expected: no output (valid syntax).

- [ ] **Step 5: Commit**

```bash
git add vite.config.mjs
git commit -m "build: replace TyphonJS PostCSS/terser config with standalone autoprefixer"
```

---

### Task 3: Bump manifest compatibility to v14

**Files:**
- Modify: `system.json`

- [ ] **Step 1: Edit the `compatibility` block**

Change:
```json
"compatibility": {
   "minimum": "11",
   "verified": "13",
   "maximum": "13"
},
```
to:
```json
"compatibility": {
   "minimum": "13",
   "verified": "14",
   "maximum": "14"
},
```

- [ ] **Step 2: Commit**

```bash
git add system.json
git commit -m "build: declare Foundry v14 compatibility"
```

---

### Task 4: Create the `ReactiveDocument` bridge

**Files:**
- Create: `src/document/reactive/ReactiveDocument.svelte.js`

- [ ] **Step 1: Write the bridge**

```js
import { createSubscriber } from 'svelte/reactivity';

/**
 * @class ReactiveDocument
 * Bridges a Foundry Document into Svelte 5 reactivity. Reads go through `.data` (a $state snapshot
 * refreshed from Foundry update hooks). Writes go through `doc.update(...)`. A temporary store-compat
 * shim (`subscribe`/`destroy`) lets legacy `$document` components keep working during the migration;
 * remove the shim once no `$document` readers remain.
 */
export default class ReactiveDocument {
   /** @type {object} The reactive snapshot of document data. */
   #snapshot = $state({});

   /** @type {() => void} Subscriber registration returned by createSubscriber. */
   #subscribe;

   /** @type {number[]} Hook ids registered by the store-compat shim. */
   #shimHooks = [];

   /**
    * @param {foundry.abstract.Document} doc - The Document to wrap.
    */
   constructor(doc) {
      /** @type {foundry.abstract.Document} The live Document; source of truth for writes. */
      this.doc = doc;

      // Seed the snapshot so components never read an empty object on first render.
      Object.assign(this.#snapshot, this.#capture());

      // Register reactivity: refresh the snapshot whenever Foundry updates this document.
      this.#subscribe = createSubscriber((update) => {
         const name = doc.documentName;
         const onUpdate = Hooks.on(`update${name}`, (changed, _diff, options) => {
            if (options?.diff === false) {
               return;
            }
            if (changed?.id !== this.doc.id) {
               return;
            }
            Object.assign(this.#snapshot, this.#capture());
            update();
         });

         return () => {
            Hooks.off(`update${name}`, onUpdate);
         };
      });
   }

   /**
    * The reactive data snapshot. Read inside a component or `$derived` to opt in to reactivity.
    * @returns {object} The reactive snapshot.
    */
   get data() {
      this.#subscribe();
      return this.#snapshot;
   }

   /**
    * Builds a plain snapshot of the document's reactive fields. `doc.system` already holds derived
    * data at read time, so this captures TITAN's prepared values.
    * @returns {object} A plain snapshot.
    * @protected
    */
   #capture() {
      return {
         name: this.doc.name,
         img: this.doc.img,
         isOwner: this.doc.isOwner,
         system: foundry.utils.deepClone(this.doc.system),
         flags: foundry.utils.deepClone(this.doc.flags),
      };
   }

   /**
    * TEMPORARY store-compat shim. Implements Svelte's store contract so legacy components that read
    * `$document` keep working through the migration. Pushes the live document on every relevant
    * update hook. Remove this method (and `destroy`) in the final phase.
    * @param {(value: foundry.abstract.Document) => void} run - Svelte store subscriber callback.
    * @returns {() => void} Unsubscribe function.
    */
   subscribe(run) {
      run(this.doc);
      const name = this.doc.documentName;
      const id = Hooks.on(`update${name}`, () => run(this.doc));
      this.#shimHooks.push(id);
      return () => {
         Hooks.off(`update${name}`, id);
      };
   }

   /**
    * Tears down all store-compat shim hooks. Call when the consuming UI is destroyed.
    */
   destroy() {
      const name = this.doc.documentName;
      this.#shimHooks.forEach((id) => Hooks.off(`update${name}`, id));
      this.#shimHooks = [];
   }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/document/reactive/ReactiveDocument.svelte.js
git commit -m "feat: add ReactiveDocument bridge with store-compat shim"
```

Note: the bridge only subscribes to the parent `update<Name>` hook. Embedded item/effect reactivity for actor sheets is handled in a later phase; in Phase 1 the actor sheets re-render on actor updates and on sheet re-open, which is sufficient for the green-build + smoke criteria.

---

### Task 5: Rewrite the root content shell (`DocumentSheetShell.svelte`)

**Files:**
- Modify: `src/document/sheet/DocumentSheetShell.svelte`

The old shell wrapped `ApplicationShell` (window chrome) and used `<svelte:component>`. AppV2 renders the frame, so the shell is now just the content: it sets context and renders the dynamic inner shell.

- [ ] **Step 1: Replace the file contents**

```svelte
<script>
   import { setContext } from 'svelte';

   /**
    * @type {{
    *   document: import('~/document/reactive/ReactiveDocument.svelte.js').default,
    *   applicationState: object,
    *   shell: import('svelte').Component
    * }}
    */
   let { document, applicationState, shell } = $props();

   // Expose the document bridge and UI state to all descendant components via context.
   // 'document' is the ReactiveDocument bridge: legacy children read `$document` (store shim),
   // converted children read `document.data` (runes).
   setContext('document', document);
   setContext('applicationState', applicationState);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
```

- [ ] **Step 2: Verify it compiles in isolation**

Run: `npx svelte-check --threshold error src/document/sheet/DocumentSheetShell.svelte` *(if svelte-check unavailable, this is verified by the full `npm run build` in Task 13)*
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/document/sheet/DocumentSheetShell.svelte
git commit -m "refactor: DocumentSheetShell as Svelte 5 content root (no ApplicationShell)"
```

---

### Task 6: Convert `TitanDocumentSheet` to `DocumentSheetV2`

**Files:**
- Modify: `src/document/sheet/TitanDocumentSheet.js`
- Delete: `src/document/sheet/ConfigureSheetButton.svelte`

`DocumentSheetV2` provides `document`, `title`, `isEditable`, the configure-sheet/ownership/import/copy-uuid controls, and form handling for free. The base now only wires the Svelte mount + bridge into context. The inner shell component is read from the legacy `options.svelte.props.shell` (set by the per-type sheet subclasses), so those subclasses are untouched this phase.

- [ ] **Step 1: Replace the file contents**

```js
import { mount, unmount } from 'svelte';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import darkModeSheets from '~/helpers/Settings/DarkModeSheets.js';

const { DocumentSheetV2 } = foundry.applications.api;

/**
 * @class TitanDocumentSheet
 * @extends {DocumentSheetV2}
 * A Document Sheet that mounts a Svelte 5 component tree into the ApplicationV2 content element.
 */
export default class TitanDocumentSheet extends DocumentSheetV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /** @type {ReactiveDocument | undefined} The reactive document bridge. */
   #bridge = void 0;

   /**
    * @param {foundry.abstract.Document} sheetDocument - The Document this sheet represents.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Add default and dark-mode classes.
      const classes = ['titan', 'titan-document-sheet'];
      if (darkModeSheets()) {
         classes.push('titan-dark-mode');
      }
      options.classes = options.classes ? mergeArrays(classes, options.classes) : classes;

      // DocumentSheetV2 expects the document on the options object and exposes it via `this.document`
      // (a getter — do NOT assign to it).
      super(foundry.utils.mergeObject(options, { document: sheetDocument }));

      // Build the reactive bridge and the UI-only application state store.
      this.#bridge = new ReactiveDocument(sheetDocument);
      this.applicationState = this._createReactiveState();
   }

   /**
    * Default ApplicationV2 options.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { width: 700, height: 'auto' },
      window: { resizable: false, minimizable: true },
   };

   /**
    * Overridable factory for the reactive UI-state store. Subclasses override.
    * @returns {object | undefined} The newly created state store.
    * @protected
    */
   _createReactiveState() {
      return void 0;
   }

   /**
    * Prepare render data. Props are assembled in `_replaceHTML`; nothing is needed here.
    * @override
    * @returns {Promise<object>} An empty context object.
    * @protected
    */
   async _renderHTML(context, options) {
      return {};
   }

   /**
    * Mount the Svelte tree on first render. Subsequent renders are no-ops: reactivity is driven by
    * the ReactiveDocument bridge's update hooks, not by the ApplicationV2 render cycle.
    * @override
    * @param {object} result - Value returned from `_renderHTML` (unused).
    * @param {HTMLElement} content - The content element to mount into.
    * @param {{ isFirstRender: boolean }} options - Render options.
    * @protected
    */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         // The inner shell component is supplied by the per-type subclass via legacy svelte options.
         const shell = this.options.svelte?.props?.shell;
         this.#mountHandle = mount(DocumentSheetShell, {
            target: content,
            props: {
               document: this.#bridge,
               applicationState: this.applicationState,
               shell,
            },
         });
      }
   }

   /**
    * Tear down the Svelte tree and the bridge when the window closes.
    * @override
    * @param {object} options - Close options.
    * @protected
    */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
      this.#bridge?.destroy();
   }
}
```

- [ ] **Step 2: Delete the now-redundant configure button**

Run: `git rm src/document/sheet/ConfigureSheetButton.svelte`
(`DocumentSheetV2` already renders a configure-sheet control via `window.controls`.)

- [ ] **Step 3: Verify `options.svelte` survives AppV2 option merge**

This base reads `this.options.svelte.props.shell`. Confirm ApplicationV2 preserves unknown option keys. Inspect the merge in `C:\FoundryVTT\V14\dev\foundry\client\applications\api\application.mjs` (`_initializeApplicationOptions`). If unknown keys are stripped, fall back: in each subclass constructor read `options.svelte.props.shell` and pass it through `DEFAULT_OPTIONS`-safe storage. Expected for v14: `foundry.utils.mergeObject` preserves unknown keys, so `this.options.svelte.props.shell` is present.
Verification at runtime is covered by Task 13 (the Commodity sheet renders its shell).

- [ ] **Step 4: Commit**

```bash
git add src/document/sheet/TitanDocumentSheet.js
git commit -m "refactor: TitanDocumentSheet extends DocumentSheetV2 with Svelte 5 mount"
```

Note: custom AppV1 header buttons (`ItemSheetSendToChatButton`, token link/unlink, import) ride the now-uncalled `_getHeaderButtons` in the subclasses; they are temporarily absent in Phase 1 and restored as AppV2 `window.controls` in a later phase. This is a known, accepted Phase-1 regression.

---

### Task 7: Move the chat-message mount to `mount()`

**Files:**
- Modify: `src/hooks/OnRenderChatMessageHTML.js`

- [ ] **Step 1: Replace the imports and the mount call**

Replace the top import:
```js
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store/fvtt/document';
```
with:
```js
import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
```

Replace the mount block (the `const document = new TJSDocument(message); message._svelteComponent = new ChatMessageShell({...})` section) with:
```js
      // Add the Svelte component.
      const bridge = new ReactiveDocument(message);
      const handle = mount(ChatMessageShell, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });

      // Store the mount handle and bridge for teardown on delete.
      message._svelteComponent = { handle, bridge };
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/hooks/OnRenderChatMessageHTML.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/OnRenderChatMessageHTML.js
git commit -m "refactor: mount chat-message shell via Svelte 5 mount() + ReactiveDocument"
```

Note: `ChatMessageShell.svelte` reads `documentStore` and does `setContext('document', documentStore)` then `$document`; the bridge's store shim makes `$document` work unchanged.

---

### Task 8: Move the chat-message teardown to `unmount()`

**Files:**
- Modify: `src/hooks/OnPreDeleteChatMessage.js`

- [ ] **Step 1: Replace the file contents**

```js
import { unmount } from 'svelte';

/**
 * Called on a Chat Message to destroy the Svelte component before it is deleted.
 * @param {ChatMessage} message - The chat message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   // Check if this chat message has a mounted Svelte component.
   const svelteComponent = message?._svelteComponent;
   if (message?.flags.titan && svelteComponent?.handle) {
      // Tear down the bridge hooks, then unmount the component.
      svelteComponent.bridge?.destroy();
      unmount(svelteComponent.handle, { outro: true });
      message._svelteComponent = void 0;
   }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/hooks/OnPreDeleteChatMessage.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/OnPreDeleteChatMessage.js
git commit -m "refactor: unmount chat-message shell via Svelte 5 unmount()"
```

---

### Task 9: Convert the dialog base to a Svelte-mounting `ApplicationV2`

**Files:**
- Modify: `src/helpers/dialogs/Dialog.js`

The ~5 check-dialog classes call `super({ title, content: { class, props }, id })`. Preserve that shape: the new base mounts `options.content.class` with `options.content.props`. No check-dialog class changes this phase.

- [ ] **Step 1: Replace the file contents**

```js
import { mount, unmount } from 'svelte';
import { Z_INDEX_APP } from '~/system/Constants.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import darkModeSheets from '~/helpers/Settings/DarkModeSheets.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';

const { ApplicationV2 } = foundry.applications.api;

/**
 * @class TitanDialog
 * @extends {ApplicationV2}
 * Base dialog that mounts a Svelte 5 component (`options.content.class`) with `options.content.props`.
 */
export default class TitanDialog extends ApplicationV2 {
   /** @type {object | undefined} The mounted Svelte component handle. */
   #mountHandle = void 0;

   /** @type {{ class: import('svelte').Component, props: object }} The Svelte content descriptor. */
   #content;

   /**
    * @param {object} options - Options for the dialog window. Must include
    *    `content: { class, props }` describing the Svelte component to mount.
    */
   constructor(options) {
      const classes = ['titan', 'titan-dialog'];
      if (darkModeSheets()) {
         classes.push('titan-dark-mode');
      }
      options.classes = options.classes ? mergeArrays(classes, options.classes) : classes;
      options.id = options.id ? `${options.id}-${generateUUID()}` : `titan-dialog-${generateUUID()}`;

      // Capture and strip the Svelte content descriptor before passing options to ApplicationV2.
      const content = options.content;
      delete options.content;

      super(options);

      this.#content = content;
   }

   /**
    * Default ApplicationV2 options.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { width: 320, height: 'auto' },
      window: { resizable: false, minimizable: false },
      zIndex: Z_INDEX_APP,
   };

   /** @override */
   async _renderHTML(context, options) {
      return {};
   }

   /** @override */
   _replaceHTML(result, content, options) {
      if (options.isFirstRender) {
         this.#mountHandle = mount(this.#content.class, {
            target: content,
            props: this.#content.props,
         });
      }
   }

   /** @override */
   _onClose(options) {
      super._onClose(options);
      if (this.#mountHandle) {
         unmount(this.#mountHandle, { outro: true });
         this.#mountHandle = void 0;
      }
   }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/helpers/dialogs/Dialog.js`
Expected: no output.

- [ ] **Step 3: Verify `zIndex`/`title` option placement against v14**

`title` for these dialogs is passed at the top level by the check-dialog classes (`title: '...'`). Confirm ApplicationV2 reads the window title from `options.window.title`, not `options.title`. Inspect `application.mjs` DEFAULT_OPTIONS (`window.title`). If v14 requires `window.title`, add a constructor line: `options.window = foundry.utils.mergeObject(options.window ?? {}, { title: options.title ?? '' });`. Expected: v14 uses `options.window.title`; add the merge line.

- [ ] **Step 4: Commit**

```bash
git add src/helpers/dialogs/Dialog.js
git commit -m "refactor: TitanDialog extends ApplicationV2 with Svelte 5 mount"
```

---

### Task 10: Native `<prose-mirror>` wrapper component

**Files:**
- Create: `src/helpers/svelte-components/editor/ProseMirrorEditor.svelte`

- [ ] **Step 1: Write the wrapper**

```svelte
<script>
   import { onMount } from 'svelte';

   /**
    * @type {{
    *   document: foundry.abstract.Document,
    *   fieldName: string,
    *   value?: string,
    *   editable?: boolean,
    *   toggled?: boolean
    * }}
    */
   let {
      document,
      fieldName,
      value = '',
      editable = true,
      toggled = false,
   } = $props();

   /** @type {HTMLElement} The container the <prose-mirror> element is appended into. */
   let container;

   onMount(() => {
      // Build Foundry's native ProseMirror custom element.
      const editor = foundry.applications.elements.HTMLProseMirrorElement.create({
         name: fieldName,
         value,
         toggled,
      });
      if (document?.uuid) {
         editor.dataset.documentUuid = document.uuid;
      }
      if (!editable) {
         editor.setAttribute('disabled', '');
      }

      // Persist edits back to the document on save/change.
      const onChange = () => {
         document.update({ [fieldName]: editor.value });
      };
      editor.addEventListener('change', onChange);

      container.appendChild(editor);

      return () => {
         editor.removeEventListener('change', onChange);
         editor.remove();
      };
   });
</script>

<div bind:this={container} class="editor rich-text"></div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
```

- [ ] **Step 2: Verify the element API against v14 source**

Confirm the create signature and event name in `C:\FoundryVTT\V14\dev\foundry\client\applications\elements\prosemirror-editor.mjs`: `static create({ enriched, toggled, value })`, attribute `name` → `fieldName`, `data-document-uuid` for collaborative editing, and that it dispatches a `change` event with the new value on save. Adjust the event name (`change` vs `editor:save`) and attribute casing if the source differs.
Expected: `create` accepts `{ value, toggled }`, `name` attribute sets the field; collaborative editing uses `data-document-uuid`.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/svelte-components/editor/ProseMirrorEditor.svelte
git commit -m "feat: native <prose-mirror> Svelte wrapper to replace TJSProseMirror"
```

---

### Task 11: Point the editor inputs at the new wrapper

**Files:**
- Modify: `src/document/svelte-components/input/DocumentEditorInput.svelte`
- Modify: `src/document/svelte-components/input/DocumentBoundEditorInput.svelte`

These stay in legacy mode (Svelte 4 syntax) — only the TyphonJS import and component usage change.

- [ ] **Step 1: `DocumentEditorInput.svelte`**

Replace the import:
```js
import { TJSProseMirror } from '@typhonjs-fvtt/svelte-standard/component';
```
with:
```js
import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
```

Replace the `<TJSProseMirror options={{...}}/>` element with:
```svelte
   <ProseMirrorEditor
      document={$document}
      fieldName={path}
      value={foundry.utils.getProperty($document, path)}
      editable={$document.isOwner && !disabled}
   />
```

- [ ] **Step 2: `DocumentBoundEditorInput.svelte`**

Replace the import:
```js
import { TJSProseMirror } from '@typhonjs-fvtt/standard/component/fvtt/editor';
```
with:
```js
import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
```

Replace the `<TJSProseMirror .../>` element. This component was passed a raw `value` and called `refreshSystemDocument` on save; the new wrapper persists via `document.update`. Keep `refreshSystemDocument` import only if still used elsewhere in the file (it is not after this change — remove the import too):
```svelte
   <ProseMirrorEditor
      document={$document}
      fieldName="system.description"
      value={value}
      editable={$document.isOwner && !disabled}
   />
```
Note: confirm the actual bound field for this component from its call sites before finalizing `fieldName`; if the parent passes a `path`, thread it through as a prop instead of hardcoding `system.description`.

- [ ] **Step 3: Verify syntax**

Run: `node --check` is not valid for `.svelte`; rely on `npm run build` (Task 13). For now: `git diff --stat`.

- [ ] **Step 4: Commit**

```bash
git add src/document/svelte-components/input/DocumentEditorInput.svelte src/document/svelte-components/input/DocumentBoundEditorInput.svelte
git commit -m "refactor: editor inputs use native <prose-mirror> wrapper"
```

---

### Task 12: Replace the `slideFade` transition

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte`

- [ ] **Step 1: Swap the import and transition**

Replace:
```js
import { slideFade } from '@typhonjs-fvtt/runtime/svelte/transition';
```
with:
```js
import { slide } from 'svelte/transition';
```

Replace each `transition:slideFade|local` with `transition:slide|local`.

- [ ] **Step 2: Commit**

```bash
git add src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte
git commit -m "refactor: replace TyphonJS slideFade with built-in slide transition"
```

---

### Task 13: Green build, lint, and live v14 smoke test

**Files:** none (verification + fixes).

- [ ] **Step 1: Confirm no TyphonJS references remain**

Run: `grep -rn "@typhonjs-fvtt\|#runtime/\|#standard/\|slideFade\|TJSDocument\|TJSDialog\|TJSProseMirror\|ApplicationShell\|SvelteApplication" src`
Expected: **no matches**. Fix any stragglers (each is a missed cutover site).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: completes without error; `index.js` and `style.css` written to the system root. Svelte may emit *legacy-mode* and `<svelte:component>`-deprecation **warnings** for unconverted components — warnings are acceptable in Phase 1; **errors are not**. Fix errors until the build is green.

- [ ] **Step 3: Lint**

Run: `npm run eslint`
Expected: passes (fix any new lint errors in the files this plan created/modified).

- [ ] **Step 4: Behavioral smoke — Commodity first**

Launch v14 (`cd C:\FoundryVTT\V14\dev` then `node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata`). In a world:
- Create or open a **Commodity** item. Expected: the sheet window opens with the AppV2 frame and the Commodity sheet content renders.
- Edit the name and a numeric field (e.g. quantity/value); blur. Expected: the value persists (reopen confirms) and the displayed value updates (bridge reactivity via the store shim).
- Open the window "controls" menu. Expected: a configure-sheet control is present (provided by `DocumentSheetV2`).

- [ ] **Step 5: Behavioral smoke — breadth**

- Open one of each: **player actor**, **npc actor**, and each remaining **item type**. Expected: each sheet opens and renders without console errors.
- Roll an **attribute check** from a character sheet. Expected: the check dialog opens (TitanDialog/AppV2), rolling produces a chat message that renders its Svelte component (chat mount).
- Advance a **combat turn** with a character combatant. Expected: a turn report chat message renders.
- Edit a **rich-text/description** field on an item. Expected: the `<prose-mirror>` editor appears and saves.

Record any sheet that errors; each is a follow-up fix within Phase 1 (do not proceed to Phase 2 until breadth passes).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test: Phase 1 foundation cutover green build + v14 smoke verified"
```

---

## Phase 1 exit criteria

- `npm run build` green (warnings allowed, errors not); `npm run eslint` clean.
- Zero `@typhonjs-fvtt` / `#runtime` / `#standard` references in `src`.
- In a live v14 world: every sheet type opens and renders; field edits persist and update reactively; a check rolls → chat renders; a combat turn renders a report; a ProseMirror field saves.
- All 417 leaf components remain legacy/untouched, reading through the bridge's store shim.

When these hold, Phase 1 is complete and the conventions are locked. Phase 2 (leaf runes conversion, batched by area) gets its own plan.
