# TITAN Skill Svelte 5 Update + Fixups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the `titan-codebase` skill to describe the post-migration pure-Svelte-5 + Foundry-v14-ApplicationV2 architecture, create a Svelte 5 fixups tracker doc, and apply the low-risk fixups.

**Architecture:** Surgical edits to the four skill reference files and `SKILL.md` (preserve the still-accurate data-model / check / migration / combat content; rewrite only the TyphonJS-specific passages). A standalone fixups tracker lives under `docs/superpowers/plans/`. Low-risk code cleanups (`on:click`→`onclick`, `$:`→`$derived.by`, additive `aria-label`s) are applied and verified with `eslint`/`stylelint`/`grep`.

**Tech Stack:** Svelte 5 (runes, `mount()`), Foundry v14 ApplicationV2 (`DocumentSheetV2`, `ApplicationV2`), Vite 5, Markdown skill files. **No test framework exists** in this project — verification is `npm run eslint`, `npm run stylelint`, and targeted `grep`.

**Reference:** Design spec at `docs/superpowers/specs/2026-05-29-titan-skill-svelte5-update-design.md`. It contains the full verified-facts list; this plan assumes those facts.

> **Commit policy for this plan:** The user controls commits. Each task ends with a commit step, but only run it if the user has approved committing. Otherwise leave changes staged/unstaged for the user.

---

## File map

**Skill files (edit):**
- `.claude/skills/titan-codebase/SKILL.md` — stack, sibling-skill routing, high-level architecture prose.
- `.claude/skills/titan-codebase/references/conventions.md` — import maps, application/reactivity patterns, gotchas.
- `.claude/skills/titan-codebase/references/abstractions.md` — Sheets section + final "How they wire together" sheet sentence.
- `.claude/skills/titan-codebase/references/data-flow.md` — check step 2 (dialog) & step 6 (chat render); sheet render lifecycle (steps 1–7).

**Project doc (create):**
- `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md` — fixups tracker.

**Code fixups (edit):**
- `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte`
- `src/document/types/actor/sheet/ActorSheetImportActorButton.svelte`
- `src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte`
- `src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte`
- `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte`
- `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
- `src/helpers/svelte-components/tag/EditDeleteTag.svelte`
- `src/helpers/svelte-components/button/IconButton.svelte`

---

## Task 1: Rewrite `SKILL.md` stack, routing, and architecture prose

**Files:**
- Modify: `.claude/skills/titan-codebase/SKILL.md`

- [ ] **Step 1: Replace the "Stack at a glance" bullets**

Find this block:

```markdown
## Stack at a glance

- TyphonJS runtime (`@typhonjs-fvtt/runtime`) + `@typhonjs-fvtt/standard`, imported via bare
  `@typhonjs-fvtt/...` specifiers directly. The `#runtime/*` and `#standard/*` subpath maps are
  declared in `package.json` but are **not** used in `src/`. Intra-project imports use the `~/`
  Vite alias (resolves to `src/`).
- Svelte **4** (not 5). Foundry **v13** (`foundry-vtt-types` v13).
- Build: Vite 5. Source lives in `src/`; build output goes to the repo root.
```

Replace with:

```markdown
## Stack at a glance

- **Pure Svelte 5 (runes)** mounted directly into Foundry **v14** `ApplicationV2` — no UI
  middleware. TyphonJS was fully removed in the v14 migration. Intra-project imports use the `~/`
  Vite alias (resolves to `src/`); `$fonts/` aliases the repo `fonts/` directory.
- Foundry **v14** (`system.json` compatibility: minimum 13 / verified 14 / maximum 14). Note: the
  `@league-of-foundry-developers/foundry-vtt-types` dev dependency is still **v13** — a known
  type-package/runtime version mismatch, not a code issue.
- Build: Vite 5 with `@sveltejs/vite-plugin-svelte`. Source lives in `src/`; build output goes to
  the repo root.
```

- [ ] **Step 2: Replace the "Sibling skills" section**

Find this block:

```markdown
## Sibling skills — route here for framework/API knowledge

- `foundry-svelte-typhonjs` — the Svelte + Foundry UI layer this project actually uses.
- `svelte-4` — Svelte syntax. **Do NOT use `svelte-5`.**
- `foundry-vtt` (router) plus `foundry-data-models`, `foundry-applications`, `foundry-hooks`,
  `foundry-dice-chat`, `foundry-combat`, `foundry-config` — Foundry v13 API shape.

`foundry-svelte` (the no-middleware Svelte 5 path) and `svelte-5` do **NOT** apply to this codebase.
```

Replace with:

```markdown
## Sibling skills — route here for framework/API knowledge

- `foundry-svelte` — the no-middleware **pure Svelte 5 + ApplicationV2** UI layer this project
  actually uses.
- `svelte-5` — Svelte syntax (runes, snippets, `mount()`).
- `foundry-vtt` (router) plus `foundry-data-models`, `foundry-applications`, `foundry-hooks`,
  `foundry-dice-chat`, `foundry-combat`, `foundry-config` — Foundry API shape.

`foundry-svelte-typhonjs` and `svelte-4` (the TyphonJS / Svelte 4 path) do **NOT** apply to this
codebase — that stack was removed in the v14 migration.
```

- [ ] **Step 3: Fix the chat-render sentence in the "High-level architecture" section**

Find this sentence (in the second architecture paragraph):

```markdown
The
`OnRenderChatMessageHTML` hook wraps the resulting message in a `TJSDocument` store and mounts
`ChatMessageShell.svelte`, which dispatches to the correct check or report Svelte component based on
the `flags.titan.type` flag.
```

Replace with:

```markdown
The
`OnRenderChatMessageHTML` hook wraps the resulting message in a `ReactiveDocument` bridge and mounts
`ChatMessageShell.svelte` with Svelte 5's `mount()`, which dispatches to the correct check or report
Svelte component based on the `flags.titan.type` flag.
```

- [ ] **Step 4: Replace the sheets paragraph in the "High-level architecture" section**

Find this block (the third architecture paragraph):

```markdown
All sheets follow a three-layer TyphonJS pattern: a JS application class extending `SvelteApplication`
(`TitanDocumentSheet` and its subclasses) wraps the Foundry document in a `TJSDocument` reactive store and
mounts `DocumentSheetShell.svelte`; the shell sets `document` and `applicationState` stores into Svelte context
so every descendant component can subscribe reactively via `$document`; the innermost components read and write
back through `document.update(...)` or the `refreshSystemDocument` snapshot helper. The `~/` Vite alias (→
`src/`) is the only intra-project import mechanism; TyphonJS packages are imported as bare `@typhonjs-fvtt/...`
specifiers.
```

Replace with:

```markdown
All sheets follow a three-layer pattern: a JS application class extending Foundry v14 `DocumentSheetV2`
(`TitanDocumentSheet` and its subclasses) builds a `ReactiveDocument` bridge around the Foundry document and
mounts `DocumentSheetShell.svelte` with Svelte 5's `mount()` on first render; the shell sets the `document`
bridge and the `applicationState` store into Svelte context so every descendant reads
`const document = getContext('document')` and accesses live, reactive data via `document.data.system.*`; the
innermost components write back through `document.data.update(...)` or the `refreshSystemDocument` snapshot
helper. The `~/` Vite alias (→ `src/`) is the intra-project import mechanism; no TyphonJS packages remain.
```

- [ ] **Step 5: Verify no stale references remain in SKILL.md**

Run: `grep -nE "TyphonJS|TJSDocument|SvelteApplication|svelte-4|foundry-svelte-typhonjs|#runtime|#standard|\$document|Svelte \*\*4\*\*|Foundry \*\*v13\*\*" .claude/skills/titan-codebase/SKILL.md`
Expected: no output (the only allowed matches are the explicit "TyphonJS was fully removed" / "do NOT apply ... removed in the v14 migration" mentions — confirm any hits are those).

- [ ] **Step 6: Commit** (only if the user approved committing)

```bash
git add .claude/skills/titan-codebase/SKILL.md
git commit -m "docs(skill): update titan-codebase SKILL.md for Svelte 5 + ApplicationV2"
```

---

## Task 2: Rewrite `conventions.md` import maps, patterns, and gotchas

**Files:**
- Modify: `.claude/skills/titan-codebase/references/conventions.md`

- [ ] **Step 1: Replace the "Import maps" section**

Find the section that begins `## Import maps` and ends just before `## TyphonJS patterns in use` (the block describing `#runtime/*`, `#standard/*`, the divergent editor specifiers, and the `~/` alias). Replace the entire `## Import maps` section body with:

```markdown
## Import maps

There are no TyphonJS runtime imports in `src/` — the v14 migration removed
`@typhonjs-fvtt/runtime`, `@typhonjs-fvtt/standard`, `@typhonjs-fvtt/svelte-standard`, and the
`#runtime/*` / `#standard/*` subpath maps entirely. (The `@typhonjs-config/*` and
`@typhonjs-fvtt/eslint-config-*` packages remain in `devDependencies` as ESLint tooling only.)

Svelte and Foundry are used directly:

```js
import { mount, unmount } from 'svelte';
import { getContext, setContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import { slide, fade } from 'svelte/transition';

const { DocumentSheetV2, ApplicationV2 } = foundry.applications.api;
```

The `~/` path alias (configured in `vite.config.mjs` as a Vite `resolve.alias` pointing at `src/`)
**is** used everywhere for intra-project imports; `$fonts/` aliases the repo `fonts/` directory:

```js
import assert from '~/helpers/utility-functions/Assert.js';
import localize from '~/helpers/utility-functions/Localize.js';
```
```

- [ ] **Step 2: Replace the "TyphonJS patterns in use" section**

Find the section beginning `## TyphonJS patterns in use` and ending just before `## Styling` (covering `SvelteApplication`, `TJSDocument`, `TJSDialog`, and TyphonJS transitions). Replace the entire section with:

```markdown
## Application & reactivity patterns

**`DocumentSheetV2` mount lifecycle** — `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`)
extends `foundry.applications.api.DocumentSheetV2`. It mounts the Svelte tree with Svelte 5's
`mount()` (from `'svelte'`) inside `_replaceHTML()` **on first render only** (`options.isFirstRender`)
and tears it down with `unmount(handle, { outro: true })` in `_onClose()`. `_renderHTML()` returns
`{}`. The per-type subclass supplies the inner shell component via `this.options.svelte.props.shell`.
`TitanDialog` (`src/helpers/dialogs/Dialog.js`) follows the same lifecycle on a bare
`foundry.applications.api.ApplicationV2`, mounting `options.content.class` with `options.content.props`.

**`ReactiveDocument` bridge** — `src/document/reactive/ReactiveDocument.svelte.js` is the
Foundry↔Svelte-5 reactivity bridge (it replaces TyphonJS `TJSDocument`). It wraps the live document;
its `.data` getter calls a `createSubscriber()` (from `'svelte/reactivity'`) subscriber and returns
the **live document**, so reading `document.data.system.x` inside a component or `$derived` re-runs
when the document changes. The subscriber registers `update<DocumentName>` plus embedded
`create/update/deleteItem` and `create/update/deleteActiveEffect` hooks and tears them down
automatically when the last reactive reader unsubscribes (on unmount). Because `.data` is the live
document, reads (`.data.system.x`), writes (`.data.update(...)`), collections (`.data.items`), and
methods all go through the same accessor.

**Context access convention** — `DocumentSheetShell.svelte` sets the `ReactiveDocument` bridge into
context under `'document'` and the UI-state store under `'applicationState'`. Every descendant reads:

```svelte
import { getContext } from 'svelte';
const document = getContext('document');          // ReactiveDocument bridge
const appState = getContext('applicationState');  // writable store
```

then accesses reactive data via `document.data.system.*`. There is no `$document` store
auto-subscription — that syntax was swept out across all of `src/`. `applicationState` is still a
Svelte `writable()` store (factory functions such as `createCharacterSheetState`), consumed with
`$appState` / `.update()`.

**Dialog data passing** — check dialogs (e.g. `AttributeCheckDialog`) construct with
`content: { class: CheckDialogShell, props: { shell, actor, checkOptions: writable(...),
checkParameters: writable(...) } }` and the shell distributes those stores to children via
`setContext`.

**Dynamic component dispatch** — `<svelte:component this={...}>` is gone (deprecated in Svelte 5
runes mode). Shells select a component class and render it with `{@const}`:

```svelte
{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
```

`ChatMessageShell.svelte` dispatches on `document.data.flags.titan.type` via a type→component map and
renders the chosen class the same way.

**Transitions** — Svelte built-ins from `'svelte/transition'` (`slide`, `fade`), e.g.
`<li transition:slide|local>`. The TyphonJS `slideFade` transition is no longer used.

**Rich text** — `ProseMirrorEditor.svelte` (`src/helpers/svelte-components/editor/`) wraps Foundry's
native `foundry.applications.elements.HTMLProseMirrorElement`; `DocumentBoundEditorInput.svelte` and
`DocumentEditorInput.svelte` delegate to it (TyphonJS `TJSProseMirror` is gone).
```

- [ ] **Step 3: Update the "Svelte context protocol" gotcha**

Find this bullet under `## Other gotchas`:

```markdown
- **Svelte context protocol** — `document` (a `TJSDocument` store) and `applicationState` (a writable store)
  are set into context by `DocumentSheetShell.svelte`. All descendant components must use `getContext` to
  access them — they are never passed as props down the tree.
```

Replace with:

```markdown
- **Svelte context protocol** — `document` (a `ReactiveDocument` bridge) and `applicationState` (a writable
  store) are set into context by `DocumentSheetShell.svelte`. All descendant components must use `getContext`
  to access them — they are never passed as props down the tree. Read reactive data via `document.data.*`
  (not `$document`).
```

- [ ] **Step 4: Delete the stale `accessors={true}` gotcha**

Find and delete this entire bullet under `## Other gotchas`:

```markdown
- **`svelte:options accessors={true}`** — The app/dialog shells (e.g. `DocumentSheetShell.svelte`) use this
  to allow `SvelteApplication` to read and write component props after mount (required by the TyphonJS
  application shell contract).
```

(Remove the bullet entirely; `accessors` was removed from all shells during the migration.)

- [ ] **Step 5: Verify no stale references remain in conventions.md**

Run: `grep -nE "TyphonJS|TJSDocument|TJSDialog|TJSProseMirror|SvelteApplication|ApplicationShell|slideFade|#runtime|#standard|svelte:component|accessors|\\\$document" .claude/skills/titan-codebase/references/conventions.md`
Expected: no output except the explicit "replaces TyphonJS `TJSDocument`", "TyphonJS `slideFade` ... no longer used", "`TJSProseMirror` is gone", and "no `$document`" mentions that describe what was removed. Confirm each hit is one of those.

- [ ] **Step 6: Commit** (only if the user approved committing)

```bash
git add .claude/skills/titan-codebase/references/conventions.md
git commit -m "docs(skill): rewrite conventions.md for Svelte 5 application/reactivity patterns"
```

---

## Task 3: Rewrite the Sheets section in `abstractions.md`

**Files:**
- Modify: `.claude/skills/titan-codebase/references/abstractions.md`

- [ ] **Step 1: Replace the "Base layer" bullets under "## Sheets"**

Find this block (under `## Sheets` → `**Base layer**`):

```markdown
- `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends
  `SvelteApplication` (TyphonJS). Wraps the document in a `TJSDocument` reactive store,
  mounts `DocumentSheetShell.svelte` as the root Svelte component, injects the document and
  `applicationState` stores via Svelte context, and applies dark-mode class handling.
- `DocumentSheetShell.svelte` — the `ApplicationShell` wrapper; it receives `document`,
  `applicationState`, and a `shell` prop, then mounts the shell with `<svelte:component>`.
```

Replace with:

```markdown
- `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends Foundry v14
  `DocumentSheetV2`. In its constructor it builds a `ReactiveDocument` bridge around the document
  (`this.#bridge`) and the UI-only `applicationState` store (`_createReactiveState()`); applies
  default + dark-mode classes; and on first render (`_replaceHTML`, `options.isFirstRender`) mounts
  `DocumentSheetShell.svelte` via Svelte 5 `mount()`, passing `{ document: bridge, applicationState,
  shell }` as props. `_onClose` calls `unmount(handle, { outro: true })`.
- `DocumentSheetShell.svelte` — receives `{ document, applicationState, shell }` as `$props()`, sets
  `document` (the `ReactiveDocument` bridge) and `applicationState` into Svelte context, and renders
  the type-specific shell via `{#if shell}{@const Shell = shell}<Shell />{/if}` (not
  `<svelte:component>`).
```

- [ ] **Step 2: Fix the sheet sentence in "## How they wire together"**

Find this paragraph near the end of the file:

```markdown
`TitanDocumentSheet` (extending TyphonJS `SvelteApplication`) wraps the document in a
`TJSDocument` store and mounts `DocumentSheetShell.svelte`, making the document reactively
available to the entire sheet component tree via Svelte context. Sheet subclasses supply their
own shell Svelte component (e.g., `PlayerSheetShell.svelte`) and an `applicationState` store for
UI-only state (open tabs, expanded sections) that does not need to be persisted.
```

Replace with:

```markdown
`TitanDocumentSheet` (extending Foundry v14 `DocumentSheetV2`) wraps the document in a
`ReactiveDocument` bridge and mounts `DocumentSheetShell.svelte` with Svelte 5 `mount()`, making the
document reactively available to the entire sheet component tree via Svelte context (children read
`document.data.*`). Sheet subclasses supply their own shell Svelte component (e.g.,
`PlayerSheetShell.svelte`) and an `applicationState` store for UI-only state (open tabs, expanded
sections) that does not need to be persisted.
```

- [ ] **Step 3: Verify no stale references remain in abstractions.md**

Run: `grep -nE "TyphonJS|TJSDocument|SvelteApplication|ApplicationShell|svelte:component|\\\$document" .claude/skills/titan-codebase/references/abstractions.md`
Expected: no output.

- [ ] **Step 4: Commit** (only if the user approved committing)

```bash
git add .claude/skills/titan-codebase/references/abstractions.md
git commit -m "docs(skill): update abstractions.md Sheets section for DocumentSheetV2 + ReactiveDocument"
```

---

## Task 4: Rewrite the TyphonJS passages in `data-flow.md`

**Files:**
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`

- [ ] **Step 1: Replace check flow "2. Dialog (optional)"**

Find this block:

```markdown
**2. Dialog (optional) — `AttributeCheckDialog` + `CheckDialogShell.svelte` +
`AttributeCheckDialogShell.svelte`**
(src/check/types/attribute-check/dialog/AttributeCheckDialog.js,
src/check/dialog/CheckDialogShell.svelte,
src/check/types/attribute-check/dialog/AttributeCheckDialogShell.svelte)
`AttributeCheckDialog` extends `TitanDialog`; it passes two `writable` stores (`checkOptions`,
`checkParameters`) as props to `CheckDialogShell.svelte`, which sets them into Svelte context and delegates
rendering to the type-specific shell (`AttributeCheckDialogShell`). The inner shell runs a reactive block
(`$:`) that calls `actor.system.getAttributeCheckParameters($checkOptions)` on every options change to keep
the displayed totals live. When the Roll button fires, the inner shell calls
`actor.system.rollAttributeCheck($checkOptions)` directly on the actor's data model, and the dialog closes.
```

Replace with:

```markdown
**2. Dialog (optional) — `AttributeCheckDialog` + `CheckDialogShell.svelte` +
`AttributeCheckDialogShell.svelte`**
(src/check/types/attribute-check/dialog/AttributeCheckDialog.js,
src/check/dialog/CheckDialogShell.svelte,
src/check/types/attribute-check/dialog/AttributeCheckDialogShell.svelte)
`AttributeCheckDialog` extends `TitanDialog` (a `foundry.applications.api.ApplicationV2`); it passes
`content: { class: CheckDialogShell, props: { shell, actor, checkOptions: writable(...),
checkParameters: writable(...) } }`. On first render `TitanDialog._replaceHTML` mounts `CheckDialogShell`
with Svelte 5 `mount()`. `CheckDialogShell` sets the two stores into Svelte context and delegates rendering
to the type-specific shell (`AttributeCheckDialogShell`). The inner shell recomputes the displayed totals
from `actor.system.getAttributeCheckParameters($checkOptions)` whenever the options change. When the Roll
button fires, the inner shell calls `actor.system.rollAttributeCheck($checkOptions)` directly on the actor's
data model, and the dialog closes.
```

- [ ] **Step 2: Replace check flow "6. Chat render"**

Find this block:

```markdown
**6. Chat render — `onRenderChatMessageHTML` hook (src/hooks/OnRenderChatMessageHTML.js)**
Foundry fires `renderChatMessageHTML` after inserting the message HTML. The hook checks
`message.flags.titan.type`; if it is a known Titan type, it wraps the document in a `TJSDocument` store and
mounts `ChatMessageShell.svelte` (src/document/types/chat-message/ChatMessageShell.svelte) into the
`.message-content` element. The shell sets the store into context as `'document'` and calls
`selectComponent()` to look up the correct component for the type (e.g. `AttributeCheckChatMessage`), then
renders it via `<svelte:component this={...}/>`.
```

Replace with:

```markdown
**6. Chat render — `onRenderChatMessageHTML` hook (src/hooks/OnRenderChatMessageHTML.js)**
Foundry fires `renderChatMessageHTML` (v13+) after inserting the message HTML. The hook checks
`message.flags.titan.type` against the frozen `TITAN_CHAT_MESSAGE_TYPES` set; if it matches, it builds a
`new ReactiveDocument(message)` bridge and mounts `ChatMessageShell.svelte`
(src/document/types/chat-message/ChatMessageShell.svelte) into the `.message-content` element via Svelte 5
`mount()`, passing the bridge as the `documentStore` prop. The mount handle and bridge are stored on
`message._svelteComponent = { handle, bridge }` for teardown in `OnPreDeleteChatMessage.js`. The shell sets
the bridge into context as `'document'` and `selectComponent()` looks up the correct component for the type
(e.g. `AttributeCheckChatMessage`), which is then rendered via `{@const}` (not `<svelte:component>`).
```

- [ ] **Step 3: Replace "Sheet render lifecycle" steps 1–6**

Find the block from `**1. Application construction — `TitanDocumentSheet` → subclass chain**` through the end of `**6. Subscription for title update**` (i.e. everything under `## Sheet render lifecycle` up to but **not** including `**7. User edits flowing back to the document — two patterns**`). Replace that whole span with:

```markdown
**1. Application construction — `TitanDocumentSheet` → subclass chain**
(src/document/sheet/TitanDocumentSheet.js)
`TitanDocumentSheet` extends Foundry v14 `DocumentSheetV2`. Its constructor calls
`super(foundry.utils.mergeObject(options, { document: sheetDocument }))` (DocumentSheetV2 exposes the
document via the read-only `this.document` getter), then builds `this.#bridge = new ReactiveDocument(
sheetDocument)` and `this.applicationState = this._createReactiveState()`. The inner shell component is
supplied by the per-type subclass on `this.options.svelte.props.shell`.

Subclass constructors extend this chain:
`TitanPlayerSheet` → `TitanCharacterSheet` → `TitanActorSheet` → `TitanDocumentSheet`.
`TitanPlayerSheet` sets `props.shell = PlayerSheetShell` so `DocumentSheetShell` knows which inner
component to render.

**2. Reactive UI state — `CharacterSheetState` (src/document/types/actor/types/character/sheet/
CharacterSheetState.js)**
`TitanCharacterSheet._createReactiveState()` calls `createCharacterSheetState(actor)`, which returns a
plain Svelte `writable` store augmented with `postAddItem` / `preDeleteItem` methods (still a store, not a
rune). It is passed into the Svelte tree as the `applicationState` prop and made available to all children
via `setContext('applicationState', applicationState)` inside `DocumentSheetShell.svelte`.

**3. Mount — `_replaceHTML` → `DocumentSheetShell.svelte`**
On first render (`options.isFirstRender`), `TitanDocumentSheet._replaceHTML` calls Svelte 5 `mount(
DocumentSheetShell, { target: content, props: { document: this.#bridge, applicationState, shell } })` and
stores the handle. Subsequent ApplicationV2 renders are no-ops — reactivity is driven by the
`ReactiveDocument` bridge, not the render cycle. `DocumentSheetShell` sets `document` (the bridge) and
`applicationState` into context, then renders the shell via `{#if shell}{@const Shell = shell}<Shell />{/if}`.

**4. Sheet body — e.g. `CharacterSheetBase.svelte`**
Reads the bridge with `const document = getContext('document')`, gates rendering behind
`{#if document.data}`, and composes the sidebar and body (`CharacterSheetSidebar`, `CharacterSheetTabs`).
Sub-components likewise call `getContext` and read `document.data.*`.

**5. ReactiveDocument reactivity**
`ReactiveDocument.data` registers a `createSubscriber()` reader and returns the live Foundry document. Any
Foundry update (`document.data.update(...)`) — or an embedded item/effect CRUD operation — fires the hooks
the subscriber registered (`update<DocumentName>`, `create/update/deleteItem`,
`create/update/deleteActiveEffect`), invalidating every reactive reader so `document.data.*` references and
`$derived` blocks re-run and the UI re-renders. Hooks tear down automatically when the sheet unmounts.

**6. Teardown — `_onClose`**
`TitanDocumentSheet._onClose` calls `super._onClose(options)`, `unmount(this.#mountHandle, { outro: true })`,
and `this.#bridge?.destroy()` (a no-op — the subscriber already removed its hooks on unmount).
```

- [ ] **Step 4: Update the write-back patterns in step 7**

Find this paragraph under `**7. User edits flowing back to the document — two patterns**`:

```markdown
*Document-bound inputs* (src/document/svelte-components/input/):
Components like `DocumentIntegerInput.svelte` and `DocumentBoundEditorInput.svelte` use `bind:value` to
mirror the `$document.system.*` field, then call `refreshSystemDocument($document, disabled)`
(src/helpers/utility-functions/RefreshSystemDocumentData.js) on `change` / `keyup`. That helper runs
`document.update({ system: structuredClone(document.system), flags: structuredClone(document.flags) })`,
writing the entire mutated system blob back to Foundry in one call.
```

Replace with:

```markdown
*Document-bound inputs* (src/document/svelte-components/input/):
Components like `DocumentIntegerInput.svelte` and `DocumentBoundEditorInput.svelte` use `bind:value` to
mirror the `document.data.system.*` field, then call `refreshSystemDocument(document.data, disabled)`
(src/helpers/utility-functions/RefreshSystemDocumentData.js) on `change` / `keyup`. That helper guards on
`!disabled && document?.isOwner`, then runs
`document.update({ system: structuredClone(document.system), flags: structuredClone(document.flags) })`,
writing the entire mutated system blob back to Foundry in one call.
```

- [ ] **Step 5: Verify no stale references remain in data-flow.md**

Run: `grep -nE "TyphonJS|TJSDocument|SvelteApplication|svelte:component|\\\$document\b" .claude/skills/titan-codebase/references/data-flow.md`
Expected: no output. (`TitanDialog` is fine — it still exists, now on ApplicationV2.)

- [ ] **Step 6: Commit** (only if the user approved committing)

```bash
git add .claude/skills/titan-codebase/references/data-flow.md
git commit -m "docs(skill): rewrite data-flow.md sheet/dialog/chat passages for Svelte 5 + ApplicationV2"
```

---

## Task 5: Create the Svelte 5 fixups tracker doc

**Files:**
- Create: `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`

- [ ] **Step 1: Write the tracker file**

Create `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md` with exactly this content:

```markdown
# Svelte 5 Migration — Remaining Fixups

**Date:** 2026-05-29
**Status:** Migration functionally complete. No TyphonJS remnants in `src/`. Remaining work is
minor idiom cleanup plus accessibility debt.

This is a living tracker. Items under "Apply now" are checked off as their code fixes land; items
under "Accepted debt" are documented decisions to NOT change, with rationale.

## Apply now (low-risk)

- [ ] **`on:click` → `onclick`** (Svelte 5 attribute form) in the four actor header buttons:
  - `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetImportActorButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte`
  - `src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte`
- [ ] **`$:` reactive block → `$derived.by(...)`** (also flips these two components from legacy
  mode to runes mode — they currently use neither `$props` nor `$state`):
  - `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte`
  - `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
- [ ] **Add `aria-label`** to the icon controls and drop the now-satisfied
  `a11y_consider_explicit_label` suppressions:
  - `src/helpers/svelte-components/tag/EditDeleteTag.svelte` — the two icon `<a>` elements.
  - `src/helpers/svelte-components/button/IconButton.svelte` — add an optional `label` prop wired to
    `aria-label`.

## Accepted debt (no action — documented decisions)

- **`EditDeleteTag.svelte` anchors-as-buttons.** The edit/delete icons are
  `<a role="button" tabindex="0">` with no `href` and no text content, so `a11y_missing_attribute`
  and `a11y_missing_content` remain suppressed even after adding `aria-label`. The clean fix is to
  convert them to `<button type="button">`, but the `tag` mixin provides no button reset, so a bare
  `<button>` would inherit browser chrome and need new reset CSS — a visual-regression risk that is
  out of scope for a mechanical cleanup. Note: those two suppression comments use the old
  hyphenated Svelte 4 names (`a11y-missing-attribute`, `a11y-missing-content`); modernize to the
  underscore Svelte 5 names if/when this component is reworked.
- **`IconButton.svelte` generic icon button.** After adding the optional `label` prop, the
  `a11y_consider_explicit_label` suppression stays as a fallback because not every call site passes
  a label. Fully retiring it requires auditing all `IconButton` consumers to pass a `label`; tracked
  as follow-up, not done here.
- **~21 `svelte-ignore state_referenced_locally`.** On intentional, lifetime-stable `setContext(...)`
  captures (e.g. `DocumentSheetShell.svelte`, `CheckDialogShell.svelte`, and many check-button
  components). The values never change for the component's life, so the warning is a false positive;
  suppression is the correct, documented response.
- **~7 `svelte-ignore missing-declaration`.** On the Foundry `game` global referenced in chat-message
  templates (e.g. `{#if ... && game.user.isGM}`). `game` is injected at runtime; a typed global
  declaration would remove the suppressions but is not worth the churn.

## Verification baseline

- No `@typhonjs-fvtt/runtime|standard|svelte-standard`, `#runtime/`, `#standard/`, `TJSDocument`,
  `TJSDialog`, `TJSProseMirror`, or `slideFade` imports anywhere in `src/`.
- No `export let`, `createEventDispatcher`, `<slot`, `<svelte:component`, `<svelte:fragment`,
  `beforeUpdate`/`afterUpdate`, or `svelte:options accessors` in `src/`.
```

- [ ] **Step 2: Verify the file is valid Markdown and present**

Run: `grep -c "Apply now" docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`
Expected: `1`

- [ ] **Step 3: Commit** (only if the user approved committing)

```bash
git add docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md
git commit -m "docs(plan): add Svelte 5 remaining-fixups tracker"
```

---

## Task 6: Convert `on:click` → `onclick` in the four actor buttons

**Files:**
- Modify: `src/document/types/actor/sheet/ActorSheetEditTokenButton.svelte:31`
- Modify: `src/document/types/actor/sheet/ActorSheetImportActorButton.svelte:18`
- Modify: `src/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte:20`
- Modify: `src/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte:25`

- [ ] **Step 1: Edit `ActorSheetEditTokenButton.svelte`**

Replace `        on:click={() => editToken()}` with `        onclick={() => editToken()}`.

- [ ] **Step 2: Edit `ActorSheetImportActorButton.svelte`**

Replace `        on:click={() => importActor()}` with `        onclick={() => importActor()}`.

- [ ] **Step 3: Edit `ActorSheetToggleLinkedTokenButton.svelte`**

Replace `        on:click={toggleLinkedToken}` with `        onclick={toggleLinkedToken}`.

- [ ] **Step 4: Edit `ActorSheetUnlinkTokenButton.svelte`**

Replace `        on:click={() => unlinkToken()}` with `        onclick={() => unlinkToken()}`.

- [ ] **Step 5: Verify no `on:click` remains in these files**

Run: `grep -rn "on:click" src/document/types/actor/sheet/`
Expected: no output.

- [ ] **Step 6: Check off the tracker item**

In `docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md`, change the `on:click` → `onclick`
checkbox from `- [ ]` to `- [x]`.

- [ ] **Step 7: Commit** (only if the user approved committing)

```bash
git add src/document/types/actor/sheet/ docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md
git commit -m "refactor(svelte5): on:click -> onclick in actor header buttons"
```

---

## Task 7: Convert `$:` blocks → `$derived.by(...)`

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte:14-29`
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte:18-32`

- [ ] **Step 1: Edit `CharacterSheetSkillsList.svelte`**

Find:

```svelte
   // Filtered Skill list.
   /** @type {*[]} */
   let filteredList = [];
   $: {
      // Get skills whose name matches the filter.
      const skillList = Object.entries(document.data.system.skill);
      const filter = $appState.tabs.skills.filter.toLowerCase();
      filteredList = skillList.filter(([key]) => localize(key).toLowerCase().includes(filter));

      // If no skill names match, look for skills with matching default.
      // attributes.
      if (filteredList.length === 0) {
         filteredList = skillList.filter((skill) =>
            localize(skill.defaultAttribute).toLowerCase().includes(filter));
      }
   }
```

Replace with:

```svelte
   // Filtered Skill list, recomputed whenever the document or the skills filter changes.
   /** @type {*[]} */
   const filteredList = $derived.by(() => {
      // Get skills whose name matches the filter.
      const skillList = Object.entries(document.data.system.skill);
      const filter = $appState.tabs.skills.filter.toLowerCase();
      let result = skillList.filter(([key]) => localize(key).toLowerCase().includes(filter));

      // If no skill names match, look for skills with matching default attributes.
      if (result.length === 0) {
         result = skillList.filter((skill) =>
            localize(skill.defaultAttribute).toLowerCase().includes(filter));
      }

      return result;
   });
```

(Note: the `skill.defaultAttribute` access on an entry tuple is preserved exactly as the original —
do not "fix" it; this task is a behavior-preserving idiom conversion.)

- [ ] **Step 2: Edit `SpellSheetCustomAspectsTab.svelte`**

Find:

```svelte
   // Initialize filtered entries.
   /** @type {*[]} */
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      document.data.system.customAspect.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.customAspects.filter.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      });
   }
```

Replace with:

```svelte
   // Indices of custom aspects matching the filter, recomputed on document/filter change.
   /** @type {*[]} */
   const filteredEntries = $derived.by(() => {
      /** @type {*[]} The matching indices. */
      const result = [];
      document.data.system.customAspect.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.customAspects.filter.toLowerCase()) !== -1
         ) {
            result.push(idx);
         }
      });

      return result;
   });
```

- [ ] **Step 3: Verify no `$:` remains in these files**

Run: `grep -rnE "^\s*\\\$:" src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte`
Expected: no output.

- [ ] **Step 4: Verify nothing else in `src/` uses `$:`** (confirm these were the last two)

Run: `grep -rnE "^\s*\\\$:" src/ --include=*.svelte`
Expected: no output.

- [ ] **Step 5: Check off the tracker item**

In the fixups tracker, change the `$:` → `$derived.by` checkbox to `- [x]`.

- [ ] **Step 6: Commit** (only if the user approved committing)

```bash
git add "src/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte" "src/document/types/item/types/spell/sheet/SpellSheetCustomAspectsTab.svelte" docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md
git commit -m "refactor(svelte5): convert remaining \$: blocks to \$derived.by (legacy -> runes)"
```

---

## Task 8: Add `aria-label`s to icon controls

**Files:**
- Modify: `src/helpers/svelte-components/tag/EditDeleteTag.svelte`
- Modify: `src/helpers/svelte-components/button/IconButton.svelte`

- [ ] **Step 1: Edit `EditDeleteTag.svelte` — edit icon anchor**

Find:

```svelte
   <!--Edit Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <!-- svelte-ignore a11y_consider_explicit_label -->
   <a
      class={EDIT_ICON}
      onclick={() => {
         editFunction();
      }}
```

Replace with:

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
```

- [ ] **Step 2: Edit `EditDeleteTag.svelte` — delete icon anchor**

Find:

```svelte
   <!--Delete Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <!-- svelte-ignore a11y_consider_explicit_label -->
   <a
      class={DELETE_ICON}
      onclick={() => {
         deleteFunction();
      }}
```

Replace with:

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
```

- [ ] **Step 3: Edit `IconButton.svelte` — add a `label` prop**

Find:

```svelte
   /**
    * @typedef {object} IconButtonProps Props for the IconButton component.
    * @property {string | undefined} [icon] - The icon class to display for this button.
    * @property {boolean} [disabled] - Whether this button is currently disabled.
    * @property {string | object | undefined} [tooltip] - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    */

   /** @type {IconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

Replace with:

```svelte
   /**
    * @typedef {object} IconButtonProps Props for the IconButton component.
    * @property {string | undefined} [icon] - The icon class to display for this button.
    * @property {boolean} [disabled] - Whether this button is currently disabled.
    * @property {string | undefined} [label] - Accessible label for this icon-only button.
    * @property {string | object | undefined} [tooltip] - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    */

   /** @type {IconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      label = void 0,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
```

- [ ] **Step 4: Edit `IconButton.svelte` — wire `aria-label` onto the button**

Find:

```svelte
<!-- svelte-ignore a11y_consider_explicit_label -->
<button
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={icon}></i>
</button>
```

Replace with:

```svelte
<!-- svelte-ignore a11y_consider_explicit_label -->
<button
   aria-label={label}
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={icon}></i>
</button>
```

(The `a11y_consider_explicit_label` suppression stays as a fallback because `label` is optional —
see the fixups tracker "Accepted debt" note.)

- [ ] **Step 5: Verify the edits**

Run: `grep -n "aria-label" src/helpers/svelte-components/tag/EditDeleteTag.svelte src/helpers/svelte-components/button/IconButton.svelte`
Expected: `aria-label="Edit"`, `aria-label="Delete"`, and `aria-label={label}`.

Run: `grep -c "a11y_consider_explicit_label" src/helpers/svelte-components/tag/EditDeleteTag.svelte`
Expected: `0` (both explicit-label suppressions removed from EditDeleteTag).

- [ ] **Step 6: Check off the tracker item**

In the fixups tracker, change the `aria-label` checkbox to `- [x]`.

- [ ] **Step 7: Commit** (only if the user approved committing)

```bash
git add src/helpers/svelte-components/tag/EditDeleteTag.svelte src/helpers/svelte-components/button/IconButton.svelte docs/superpowers/plans/2026-05-29-svelte5-remaining-fixups.md
git commit -m "a11y(svelte5): add aria-labels to EditDeleteTag icons and IconButton"
```

---

## Task 9: Lint verification

**Files:** none (verification only)

- [ ] **Step 1: Run ESLint**

Run: `npm run eslint`
Expected: completes with no errors introduced by the changes. If pre-existing errors exist that are
unrelated to the touched files, note them but do not fix in this plan. Errors in any file touched by
Tasks 6–8 MUST be resolved before proceeding.

- [ ] **Step 2: Run Stylelint**

Run: `npm run stylelint`
Expected: no new errors. (Only `EditDeleteTag.svelte` / `IconButton.svelte` `<style>` blocks were
near edits, and those edits were markup-only — expect clean.)

- [ ] **Step 3: Final stale-reference sweep across the skill**

Run: `grep -rnE "TyphonJS|TJSDocument|TJSDialog|TJSProseMirror|SvelteApplication|ApplicationShell|slideFade|svelte:component|#runtime|#standard" .claude/skills/titan-codebase/`
Expected: only the intentional "removed / replaces / no longer used / gone" descriptive mentions.
Confirm every hit is descriptive, not a live instruction.

- [ ] **Step 4: Confirm the four `on:click` and two `$:` are gone repo-wide**

Run: `grep -rnE "on:click" src/document/types/actor/sheet/ ; grep -rnE "^\s*\\\$:" src/ --include=*.svelte`
Expected: no output.

- [ ] **Step 5: Final commit if anything outstanding** (only if the user approved committing)

```bash
git status
# If clean, nothing to do. Otherwise stage and commit per the relevant task above.
```

---

## Self-review notes (author)

- **Spec coverage:** SKILL.md (Task 1) ✓, conventions.md (Task 2) ✓, abstractions.md Sheets + wiring (Task 3) ✓, data-flow.md dialog/chat/lifecycle (Task 4) ✓, fixups tracker as separate project doc (Task 5) ✓, on:click fix (Task 6) ✓, $: fix (Task 7) ✓, aria-label fix (Task 8) ✓, lint/grep verification (Task 9) ✓. The spec's "out of scope" items (foundry-vtt-types version, accepted-debt suppressions) are intentionally not actioned and are documented in the tracker.
- **Placeholder scan:** No TBD/TODO; every edit shows exact old/new text.
- **Consistency:** `ReactiveDocument`, `document.data`, `DocumentSheetV2`, `ApplicationV2`, `mount()`/`unmount()`, `{@const}` dispatch, and `refreshSystemDocument(document.data, disabled)` are used identically across all tasks.
```

