# Conventions & Non-Obvious Facts

> Descriptive only. For the authoritative style/formatting/documentation rules, see
> `.claude/CLAUDE.md` (summarized at the bottom of this file).

## Import maps

`package.json` declares two Node.js subpath-import maps:

- `"#runtime/*"` → `"@typhonjs-fvtt/runtime/*"`
- `"#standard/*"` → `"@typhonjs-fvtt/svelte-standard/*"`

These aliases exist in `package.json` but are **not** what the source code actually uses. The codebase imports
TyphonJS packages with their full bare specifiers directly, not the `#runtime/` or `#standard/` shorthand. For
example:

```js
import { SvelteApplication } from '@typhonjs-fvtt/runtime/svelte/application';
import { TJSDocument }       from '@typhonjs-fvtt/runtime/svelte/store/fvtt/document';
import { TJSProseMirror }    from '@typhonjs-fvtt/standard/component/fvtt/editor';
```

The `~/` path alias (configured in `vite.config.mjs` as a Vite `resolve.alias` pointing at `src/`) **is**
used everywhere for intra-project imports, e.g.:

```js
import assert from '~/helpers/utility-functions/Assert.js';
import localize from '~/helpers/utility-functions/Localize.js';
```

## TyphonJS patterns in use

**`SvelteApplication`** — `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`) extends
`SvelteApplication`. The sheet mounts a single shell component (`DocumentSheetShell.svelte`) via
`this.options.svelte.props`. The shell wraps `ApplicationShell` (from
`@typhonjs-fvtt/runtime/svelte/component/application`) and delegates rendering to a dynamic inner component
passed as the `shell` prop:

```svelte
<ApplicationShell bind:elementRoot>
   <svelte:component this={shell}/>
</ApplicationShell>
```

**`TJSDocument`** — Created in `TitanDocumentSheet._initializeDocumentData` and passed to the Svelte component
as a prop, then placed into Svelte context via `setContext('document', document)`. Deep components retrieve it
with `getContext('document')` and subscribe reactively using the `$document` store shorthand.

**`TJSDialog`** — `TitanDialog` (`src/helpers/dialogs/Dialog.js`) extends `TJSDialog`. Check dialogs such as
`AttributeCheckDialog` extend `TitanDialog`, passing `writable` stores as Svelte props. See `data-flow.md` for
the full dialog lifecycle.

**TyphonJS transitions** — `slideFade` (from `@typhonjs-fvtt/runtime/svelte/transition`) is used alongside
Svelte's built-in `slide` for list animations. Example:

```svelte
import { slideFade } from '@typhonjs-fvtt/runtime/svelte/transition';
...
<li transition:slideFade|local>
```

## Styling

SCSS mixins are the deliberate, preferred styling mechanism — a codebase-wide refactor
(commit `fe11cca0`: "Removed use of global styles, and propagated the use of mixins") replaced all
`:global` selector usage with mixins. As of that commit, no `:global` occurrences remain in `src/`.

**Where mixins live:** `src/styles/Mixins/` contains per-domain files:
`AttributeMixins.scss`, `BorderMixins.scss`, `ButtonMixins.scss`, `FlexMixins.scss`,
`FontMixins.scss`, `InputMixins.scss`, `LabelMixins.scss`, `ListMixins.scss`,
`MarginMixins.scss`, `PaddingMixins.scss`, `PanelMixins.scss`, `RarityMixins.scss`,
`ResistanceMixins.scss`, `SeparatorMixins.scss`, `SystemMixins.scss`, `TagMixins.scss`.

**`Root.scss`** (`src/styles/Root.scss`) `@forward`s all mixin files in `src/styles/Mixins/` plus
`Variables.scss`. It is auto-prepended into every Svelte component's `<style lang="scss">` block by `svelte-preprocess`
(`prependData: '@use "src/styles/Root.scss" as *;'` in `vite.config.mjs`). This means component style blocks
can call any mixin directly without an explicit `@use`, e.g.:

```scss
<style lang="scss">
.row {
   @include flex-row;
   @include panel-1;
}
</style>
```

See `architecture.md` — `src/styles/` section — for the full list of global SCSS files.

## assert()

`assert` is a standalone default export from `src/helpers/utility-functions/Assert.js`, imported with the
`~/` alias:

```js
import assert from '~/helpers/utility-functions/Assert.js';
```

It wraps `console.assert` and also fires a Foundry UI error notification (`ui.notifications.error`) prefixed
with `"TITAN | "`. It returns the boolean result so callers can use it in a guard:

```js
if (assert(someCondition, 'Error message')) { ... }
```

`game.titan` (registered during the `init` hook in `src/hooks/OnceInit.js`) exposes the full namespace
`{ macros, assert, warn, log, error, socketManager }` — so `game.titan.assert` does exist and is the same
underlying function. Throughout the codebase the convention is to prefer the locally-imported form over the
`game.titan.*` accessors; reading `CLAUDE.md` and the code-review standards will confirm this preference.

## Other gotchas

- **`localize()` wrapper** — All i18n calls go through `src/helpers/utility-functions/Localize.js` rather than
  calling `game.i18n.localize` directly. It automatically prepends `"LOCAL."` and appends `".text"` to the key,
  so `localize('attackCheck')` resolves to `game.i18n.localize('LOCAL.attackCheck.text')`.

- **`~/` alias vs relative paths** — Cross-directory imports always use `~/` (resolves to `src/`). Relative
  paths (`./`, `../`) are only used for imports within the same immediate directory.

- **`game.titan` namespace** — Registered during the Foundry `init` hook in `src/hooks/OnceInit.js`. It
  exposes `{ macros, assert, warn, log, error, socketManager }`. The codebase convention (see `CLAUDE.md`)
  is to use the locally-imported helpers (e.g. `import assert from '~/helpers/utility-functions/Assert.js'`)
  rather than going through `game.titan.*`.

- **Svelte context protocol** — `document` (a `TJSDocument` store) and `applicationState` (a writable store)
  are set into context by `DocumentSheetShell.svelte`. All descendant components must use `getContext` to
  access them — they are never passed as props down the tree.

- **Build output goes to the repo root** — `vite.config.mjs` sets `build.outDir` to the project root
  (`__dirname`), not a `dist/` folder. Source lives in `src/`; build artifacts such as `index.js` land at the
  top level. See `architecture.md` for the full directory layout.

- **`svelte:options accessors={true}`** — The app/dialog shells (e.g. `DocumentSheetShell.svelte`) use this
  to allow `SvelteApplication` to read and write component props after mount (required by the TyphonJS
  application shell contract).

## Style rules live in CLAUDE.md

`.claude/CLAUDE.md` is the single authority for all code-style, formatting, and documentation rules for this
project — covering the 120-character wrap limit, multiline formatting for objects/arrays/Svelte components,
strict typing requirements, JSDoc conventions, and comment grammar rules. This skill file does not restate
those rules; read `.claude/CLAUDE.md` before writing or reviewing any code in this codebase.
