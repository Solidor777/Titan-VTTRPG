# Bespoke Styleable Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native `<select>` inside the shared `Select.svelte` with a custom, fully-styleable floating listbox that supports per-option icons (and arbitrary per-row styling via snippets), propagating to all ~37 select wrappers without rewriting them.

**Architecture:** A `<button role="combobox">` trigger (`Select.svelte`) drives open/close, value-clamp, and keyboard; it mounts a portaled `SelectList.svelte` (`role="listbox"`) positioned with `svelte-floating-ui`. The public prop contract (`options`, primitive `$bindable value`, `disabled`, `tooltip`, `onchange`, `testId`) is unchanged; `SelectOption` gains an optional `icon`, and `Select` gains optional `option`/`selection` snippets. Positioning code is adapted from the author's own `svelte-select-runes` package, stripped of search/multi/clear/async/grouping.

**Tech Stack:** Pure Svelte 5 (runes), SCSS (scoped, no `:global`), `svelte-floating-ui` (+ its `@floating-ui/dom` dep), FontAwesome icon classes from `src/system/Icons.js`, Vitest + `@testing-library/svelte` (happy-dom) for unit, Playwright for e2e.

## Global Constraints

- Foundry VTT v14, ApplicationV2, pure Svelte 5 runes mounted directly (no TyphonJS).
- `:global` SCSS selectors are strictly forbidden. Theme via `--titan-*` tokens (injected on `:root`) and existing SCSS mixins (`@include input`, `@include flex-group-left`).
- No dynamic imports in shipping builds; the new dependency must bundle statically.
- Intra-project imports use the `~/` Vite alias (→ `src/`).
- Comment/style rules from `.claude/CLAUDE.md`: 120-col wrap; multi-line `{}` for conditionals; typed variables with single-line comments; multi-line JSDoc for functions; present-tense comments; no process meta.
- Every variable typed with a single-line comment; every function with a multi-line JSDoc.
- Final required step: update the `titan-codebase` skill and `docs/TODO.md`.
- Unit suite baseline is **289** tests (must stay green and grow); full e2e suite must stay green.

---

### Task 1: Add `svelte-floating-ui` dependency + `portalToBody` action

**Files:**
- Modify: `package.json` (add `svelte-floating-ui` to `dependencies`)
- Create: `src/helpers/svelte-actions/PortalToBody.js`
- Create: `tests/unit/PortalToBody.test.js`

**Interfaces:**
- Produces: `portalToBody(node: HTMLElement) => { destroy: () => void }` (default export) — relocates `node` to `document.body` on mount, removes it on destroy.

- [ ] **Step 1: Add the dependency**

Edit `package.json` `dependencies` (keep alphabetical-ish order with the existing `short-unique-id`, `tippy.js`):

```json
   "dependencies": {
      "short-unique-id": "^5.0.3",
      "svelte-floating-ui": "^1.6.2",
      "tippy.js": "^6.3.7"
   },
```

Then install:

Run: `npm install`
Expected: `svelte-floating-ui` and transitive `@floating-ui/dom` added to `node_modules`; exit 0.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/PortalToBody.test.js`:

```js
import { describe, it, expect } from 'vitest';
import portalToBody from '~/helpers/svelte-actions/PortalToBody.js';

describe('portalToBody action', () => {
   it('moves the node to document.body on mount and removes it on destroy', () => {
      // A node nested inside a detached parent, simulating a clipped ancestor.
      const parent = document.createElement('div');
      const node = document.createElement('div');
      parent.appendChild(node);
      document.body.appendChild(parent);

      const handle = portalToBody(node);
      expect(node.parentElement).toBe(document.body);

      handle.destroy();
      expect(node.parentElement).toBeNull();

      parent.remove();
   });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/PortalToBody.test.js`
Expected: FAIL — cannot resolve `~/helpers/svelte-actions/PortalToBody.js`.

- [ ] **Step 4: Write the action**

Create `src/helpers/svelte-actions/PortalToBody.js`:

```js
/**
 * Svelte action that relocates its node to `document.body`, escaping ancestor `overflow` clipping
 * and `transform`-induced containing blocks. Foundry ApplicationV2 windows position themselves with
 * `transform`, which would otherwise trap and clip a floating dropdown; appending to the body lets
 * the list position against the viewport. The node is removed on destroy.
 * @param {HTMLElement} node - The element to relocate.
 * @returns {{ destroy: () => void }} The action handle.
 */
export default function portalToBody(node) {
   document.body.appendChild(node);

   return {
      /**
       * Removes the relocated node from the document.
       * @returns {void}
       */
      destroy() {
         node.remove();
      },
   };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/PortalToBody.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/helpers/svelte-actions/PortalToBody.js tests/unit/PortalToBody.test.js
git commit -m "feat: add svelte-floating-ui dep and portalToBody action"
```

---

### Task 2: `SelectList.svelte` — the portaled listbox

**Files:**
- Create: `src/helpers/svelte-components/input/select/SelectList.svelte`
- Create: `tests/unit/SelectList.test.js`

**Interfaces:**
- Consumes: `portalToBody` (Task 1); `Text.svelte`; `tooltipAction`.
- Produces: `SelectList` component with props:
  - `options: NormalizedOption[]` — `{ value, label?, tooltip?, icon? }[]` (already normalized by the parent).
  - `value: *` — the currently selected primitive value.
  - `hoverIndex: number` — `$bindable`, the keyboard-highlighted row index.
  - `listId: string` — id used for `aria-activedescendant` row ids (`${listId}-option-${i}`).
  - `testId: string | undefined` — when set, the list root carries `data-testid="${testId}-list"`.
  - `listEl: HTMLElement | undefined` — `$bindable`, the list root node (parent reads it for outside-click).
  - `floatingContent: import('svelte/action').Action` — the floating-ui content action from the parent.
  - `option: import('svelte').Snippet | undefined` — optional row-render override.
  - `onselect: (option: NormalizedOption) => void` — fired on row click.
  - `onhover: (index: number) => void` — fired on row hover/focus.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/SelectList.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import SelectList from '~/helpers/svelte-components/input/select/SelectList.svelte';

/** @type {(node: HTMLElement) => { destroy: () => void }} A no-op stand-in for the floating action. */
const noopAction = () => ({ destroy() {} });

afterEach(() => cleanup());

describe('SelectList', () => {
   it('renders one role=option per option with its icon and data-value', () => {
      render(SelectList, {
         props: {
            options: [
               { value: 'body', label: 'body', icon: 'fas fa-hand-fist' },
               { value: 'mind', label: 'mind', icon: 'fas fa-brain' },
            ],
            value: 'body',
            hoverIndex: 0,
            listId: 'titan-select-test',
            testId: void 0,
            floatingContent: noopAction,
            onselect: () => {},
            onhover: () => {},
         },
      });

      const opts = screen.getAllByRole('option');
      expect(opts).toHaveLength(2);
      expect(opts[0].getAttribute('data-value')).toBe('body');
      expect(opts[0].querySelector('i.fa-hand-fist')).not.toBeNull();
      expect(opts[0].getAttribute('aria-selected')).toBe('true');
   });

   it('fires onselect with the clicked option', async () => {
      const onselect = vi.fn();
      render(SelectList, {
         props: {
            options: [
               { value: 'body', label: 'body' },
               { value: 'mind', label: 'mind' },
            ],
            value: 'body',
            hoverIndex: 0,
            listId: 'titan-select-test',
            floatingContent: noopAction,
            onselect,
            onhover: () => {},
         },
      });

      await fireEvent.click(screen.getByText('mind'));
      expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ value: 'mind' }));
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/SelectList.test.js`
Expected: FAIL — cannot resolve `SelectList.svelte`.

- [ ] **Step 3: Write the component**

Create `src/helpers/svelte-components/input/select/SelectList.svelte`:

```svelte
<script>
   import portalToBody from '~/helpers/svelte-actions/PortalToBody.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} SelectListProps
    * @property {Array<object>} options - Normalized options ({ value, label?, tooltip?, icon? }).
    * @property {*} value - The currently selected primitive value.
    * @property {number} hoverIndex - The keyboard-highlighted row index (bindable).
    * @property {string} listId - Base id for option element ids used by aria-activedescendant.
    * @property {string} [testId] - When set, the list root carries `data-testid="${testId}-list"`.
    * @property {HTMLElement} [listEl] - The list root node (bindable; the parent reads it for outside-click).
    * @property {import('svelte/action').Action} floatingContent - The floating-ui content action.
    * @property {import('svelte').Snippet} [option] - Optional per-row render override.
    * @property {(option: object) => void} onselect - Fired with the clicked option.
    * @property {(index: number) => void} onhover - Fired with the hovered/focused row index.
    */

   /** @type {SelectListProps} */
   let {
      options,
      value,
      hoverIndex = $bindable(0),
      listId,
      testId = void 0,
      listEl = $bindable(void 0),
      floatingContent,
      option: optionSnippet = void 0,
      onselect,
      onhover,
   } = $props();

   /** @type {boolean} Hides the list for the first frame so floating-ui positions before paint. */
   let prefloat = $state(true);

   // Reveal after the first frame, mirroring the lifted package's pre-float pattern.
   $effect(() => {
      prefloat = true;
      const timer = setTimeout(() => {
         prefloat = false;
      }, 0);
      return () => clearTimeout(timer);
   });

   // Scroll the highlighted row into view as keyboard navigation moves it.
   $effect(() => {
      const active = listEl?.querySelector(`#${CSS.escape(listId)}-option-${hoverIndex}`);
      active?.scrollIntoView({ block: 'nearest' });
   });
</script>

<div
   bind:this={listEl}
   use:portalToBody
   use:floatingContent
   class="titan-select-list"
   class:prefloat
   id={listId}
   role="listbox"
   data-testid={testId ? `${testId}-list` : void 0}
>
   {#each options as opt, i (opt.value)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
      <div
         class="option"
         class:hover={i === hoverIndex}
         class:selected={opt.value === value}
         id={`${listId}-option-${i}`}
         role="option"
         aria-selected={opt.value === value}
         data-value={opt.value}
         tabindex="-1"
         onmouseover={() => onhover(i)}
         onfocus={() => onhover(i)}
         onclick={(event) => {
            event.stopPropagation();
            onselect(opt);
         }}
         use:tooltipAction={opt.tooltip}
      >
         {#if optionSnippet}
            {@render optionSnippet(opt, i)}
         {:else}
            {#if opt.icon}
               <i class={opt.icon}></i>
            {/if}
            <Text text={opt.label ?? opt.value}/>
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   .titan-select-list {
      @include flex-column;

      position: absolute;
      z-index: var(--titan-z-index-tooltip, 100);
      max-height: 16rem;
      overflow-y: auto;
      padding: 2px;
      border: var(--titan-input-border);
      border-radius: var(--titan-input-border-radius);
      background: var(--titan-panel-1-background);
      box-shadow: var(--titan-shadow-standard);

      &.prefloat {
         opacity: 0;
         pointer-events: none;
      }

      .option {
         @include flex-row;
         @include flex-group-left;

         gap: var(--titan-spacing-standard);
         padding: var(--titan-spacing-standard);
         border-radius: var(--titan-input-border-radius);
         cursor: pointer;
         white-space: nowrap;

         &.hover {
            background: var(--titan-input-hover-background, var(--titan-panel-2-background));
         }

         &.selected {
            background: var(--titan-input-selected-background, var(--titan-panel-2-background));
         }
      }
   }
</style>
```

Note: the SCSS uses existing `--titan-*` tokens. If any token name above does not resolve in the live theme, substitute the nearest existing token (grep `src/theme` / `BuildThemeStylesheetText.js`); the fallbacks in `var(--x, fallback)` keep it functional meanwhile.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/SelectList.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/svelte-components/input/select/SelectList.svelte tests/unit/SelectList.test.js
git commit -m "feat: add portaled SelectList listbox component"
```

---

### Task 3: Rewrite `Select.svelte` as the combobox trigger + controller

**Files:**
- Modify: `src/helpers/svelte-components/input/select/Select.svelte` (full rewrite of internals + `SelectOption` typedef)
- Create: `tests/unit/Select.test.js`

**Interfaces:**
- Consumes: `SelectList` (Task 2); `Text.svelte`; `tooltipAction`; `svelte-floating-ui` `createFloatingActions`, and `offset`/`flip`/`shift` from `svelte-floating-ui/dom`.
- Produces: `Select` with the unchanged contract `{ options, value (bindable primitive), disabled, tooltip, onchange, testId }` plus snippets `option(option, index)` and `selection(option)`. The trigger element carries `data-testid={testId}`, `role="combobox"`, and `data-value={value}` (the e2e read hook). The `SelectOption` typedef gains `icon?: string`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/Select.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import Select from '~/helpers/svelte-components/input/select/Select.svelte';

afterEach(() => cleanup());

describe('Select', () => {
   it('renders the selected option label on the trigger', () => {
      render(Select, { props: { options: ['body', 'mind', 'soul'], value: 'mind' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('mind');
      expect(trigger.getAttribute('data-value')).toBe('mind');
   });

   it('opens the list on click and commits a clicked option', async () => {
      const onchange = vi.fn();
      let value = 'body';
      render(Select, {
         props: {
            options: ['body', 'mind', 'soul'],
            value,
            onchange,
         },
      });
      const trigger = screen.getByRole('combobox');

      await fireEvent.click(trigger);
      const opts = screen.getAllByRole('option');
      expect(opts).toHaveLength(3);

      await fireEvent.click(screen.getByText('soul'));
      expect(onchange).toHaveBeenCalledTimes(1);
      await expect(screen.getByRole('combobox').getAttribute('data-value')).toBe('soul');
   });

   it('clamps an out-of-range value to the first option and fires onchange', async () => {
      const onchange = vi.fn();
      render(Select, {
         props: {
            options: ['body', 'mind'],
            value: 'not-a-real-value',
            onchange,
         },
      });
      // The clamp effect resets to the first option and notifies.
      await expect.poll(() => screen.getByRole('combobox').getAttribute('data-value')).toBe('body');
      expect(onchange).toHaveBeenCalled();
   });

   it('disables the trigger when disabled', () => {
      render(Select, { props: { options: ['body'], value: 'body', disabled: true } });
      expect(screen.getByRole('combobox')).toBeDisabled();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/Select.test.js`
Expected: FAIL — the current native-`<select>` `Select.svelte` has no `role="combobox"` and renders no `data-value`.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/helpers/svelte-components/input/select/Select.svelte`:

```svelte
<script>
   import { createFloatingActions } from 'svelte-floating-ui';
   import { offset, flip, shift } from 'svelte-floating-ui/dom';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import SelectList from '~/helpers/svelte-components/input/select/SelectList.svelte';

   /**
    * Object used to store data for an Option within a Select Svelte component.
    * @template T
    * @typedef {object} SelectOption
    * @property {T} value - The value for this option.
    * @property {string | number | TextData} [label] - The label to display for this option.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this option, if any.
    * @property {string} [icon] - FontAwesome class string rendered left of the label.
    */

   /**
    * @typedef {object} SelectProps
    * @property {(SelectOption<*> | string | number)[]} [options] - Options for the select element.
    * @property {*} [value] - The value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {() => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid`.
    * @property {import('svelte').Snippet} [option] - Optional per-row render override.
    * @property {import('svelte').Snippet} [selection] - Optional selected-value render override.
    */

   /** @type {SelectProps} */
   let {
      options = void 0,
      value = $bindable(void 0),
      disabled = false,
      tooltip = void 0,
      onchange,
      testId = void 0,
      option: optionSnippet = void 0,
      selection: selectionSnippet = void 0,
   } = $props();

   /** @type {string} Stable unique id seed for the listbox and its option ids. */
   const uid = $props.id();

   /** @type {string} The listbox element id. */
   const listId = `titan-select-${uid}`;

   /** @type {boolean} Whether the option list is open. */
   let listOpen = $state(false);

   /** @type {number} The keyboard-highlighted option index while open. */
   let hoverIndex = $state(0);

   /** @type {HTMLElement | undefined} The trigger button node. */
   let triggerEl = $state(void 0);

   /** @type {HTMLElement | undefined} The portaled list node (read for outside-click). */
   let listEl = $state(void 0);

   /** @type {string} Buffered typeahead characters for first-letter navigation. */
   let typeahead = '';

   /** @type {number} Timer id clearing the typeahead buffer. */
   let typeaheadTimer = 0;

   // Floating-ui actions: floatingRef on the trigger, floatingContent on the list. Positions once on
   // open (flip/shift handle viewport edges); the list closes on scroll/resize rather than tracking.
   const [floatingRef, floatingContent] = createFloatingActions({
      strategy: 'fixed',
      placement: 'bottom-start',
      middleware: [offset(4), flip(), shift({ padding: 4 })],
   });

   /**
    * Normalizes a raw option (primitive or object) into a uniform option object.
    * @param {SelectOption<*> | string | number} raw - The raw option entry.
    * @returns {{ value: *, label: *, tooltip: *, icon: * }} The normalized option.
    */
   function toOption(raw) {
      // Primitive entries become their own value; object entries pass their fields through.
      if (raw !== null && typeof raw === 'object') {
         return { value: raw.value, label: raw.label ?? raw.value, tooltip: raw.tooltip, icon: raw.icon };
      }
      return { value: raw, label: raw, tooltip: void 0, icon: void 0 };
   }

   /** @type {Array<object>} The normalized option list. */
   const normalized = $derived((options ?? []).map(toOption));

   /** @type {object | undefined} The option matching the current value. */
   const selected = $derived(normalized.find((entry) => entry.value === value));

   // Clamp value into the available options. Guarded so it converges: only writes when out of range.
   $effect(() => {
      if (!(normalized.length > 0)) {
         return;
      }
      if (!normalized.some((entry) => entry.value === value)) {
         value = normalized[0].value;
         onchange?.();
      }
   });

   /**
    * Opens the list, highlighting the currently selected option.
    * @returns {void}
    */
   function open() {
      if (disabled) {
         return;
      }
      const index = normalized.findIndex((entry) => entry.value === value);
      hoverIndex = index >= 0 ? index : 0;
      listOpen = true;
   }

   /**
    * Closes the list and returns focus to the trigger.
    * @returns {void}
    */
   function close() {
      listOpen = false;
      triggerEl?.focus();
   }

   /**
    * Commits an option as the new value, fires onchange, and closes the list.
    * @param {object} entry - The normalized option to commit.
    * @returns {void}
    */
   function commit(entry) {
      if (entry.value !== value) {
         value = entry.value;
         onchange?.();
      }
      close();
   }

   /**
    * Moves the keyboard highlight by a step, wrapping around the list.
    * @param {number} step - The direction (+1 down, -1 up).
    * @returns {void}
    */
   function moveHover(step) {
      const count = normalized.length;
      hoverIndex = (hoverIndex + step + count) % count;
   }

   /**
    * Jumps the highlight to the next option whose label/value starts with the typed character.
    * @param {string} char - The typed character.
    * @returns {void}
    */
   function jumpToTypeahead(char) {
      clearTimeout(typeaheadTimer);
      typeahead += char.toLowerCase();
      typeaheadTimer = setTimeout(() => {
         typeahead = '';
      }, 500);

      // The first option whose displayed text begins with the buffered characters.
      const match = normalized.findIndex(
         (entry) => `${entry.label ?? entry.value}`.toLowerCase().startsWith(typeahead),
      );
      if (match >= 0) {
         hoverIndex = match;
      }
   }

   /**
    * Handles keyboard interaction on the trigger, providing native-select parity.
    * @param {KeyboardEvent} event - The keydown event.
    * @returns {void}
    */
   function handleKeydown(event) {
      switch (event.key) {
         case 'ArrowDown': {
            event.preventDefault();
            if (listOpen) {
               moveHover(1);
            }
            else {
               open();
            }
            break;
         }
         case 'ArrowUp': {
            event.preventDefault();
            if (listOpen) {
               moveHover(-1);
            }
            else {
               open();
            }
            break;
         }
         case 'Home': {
            if (listOpen) {
               event.preventDefault();
               hoverIndex = 0;
            }
            break;
         }
         case 'End': {
            if (listOpen) {
               event.preventDefault();
               hoverIndex = normalized.length - 1;
            }
            break;
         }
         case 'Enter':
         case ' ': {
            event.preventDefault();
            if (listOpen) {
               commit(normalized[hoverIndex]);
            }
            else {
               open();
            }
            break;
         }
         case 'Escape': {
            if (listOpen) {
               event.preventDefault();
               close();
            }
            break;
         }
         case 'Tab': {
            if (listOpen) {
               listOpen = false;
            }
            break;
         }
         default: {
            if (event.key.length === 1) {
               if (!listOpen) {
                  open();
               }
               jumpToTypeahead(event.key);
            }
         }
      }
   }

   /**
    * Toggles the list open/closed on trigger click.
    * @returns {void}
    */
   function toggle() {
      if (listOpen) {
         listOpen = false;
      }
      else {
         open();
      }
   }

   /**
    * Closes the list on any click outside the trigger and the portaled list.
    * @param {MouseEvent} event - The window click event.
    * @returns {void}
    */
   function handleWindowClick(event) {
      if (!listOpen) {
         return;
      }
      if (triggerEl?.contains(event.target) || listEl?.contains(event.target)) {
         return;
      }
      listOpen = false;
   }

   /**
    * Closes the list when the page scrolls or resizes, since the list positions once on open.
    * @returns {void}
    */
   function closeOnViewportChange() {
      if (listOpen) {
         listOpen = false;
      }
   }
</script>

<svelte:window
   onclick={handleWindowClick}
   onscroll={closeOnViewportChange}
   onresize={closeOnViewportChange}
/>

<button
   bind:this={triggerEl}
   use:floatingRef
   type="button"
   class="titan-select"
   role="combobox"
   aria-haspopup="listbox"
   aria-expanded={listOpen}
   aria-controls={listId}
   aria-activedescendant={listOpen ? `${listId}-option-${hoverIndex}` : void 0}
   {disabled}
   data-testid={testId}
   data-value={value}
   onclick={toggle}
   onkeydown={handleKeydown}
   use:tooltipAction={tooltip}
>
   <span class="label">
      {#if selectionSnippet}
         {@render selectionSnippet(selected)}
      {:else}
         {#if selected?.icon}
            <i class={selected.icon}></i>
         {/if}
         <Text text={selected?.label ?? selected?.value ?? ''}/>
      {/if}
   </span>
   <i class="chevron fas fa-angle-down" class:open={listOpen}></i>
</button>

{#if listOpen}
   <SelectList
      options={normalized}
      {value}
      {listId}
      {testId}
      bind:hoverIndex
      bind:listEl
      {floatingContent}
      option={optionSnippet}
      onselect={commit}
      onhover={(index) => (hoverIndex = index)}
   />
{/if}

<style lang="scss">
   .titan-select {
      @include input;
      @include flex-group-left;

      gap: var(--titan-spacing-standard);
      cursor: pointer;

      .label {
         @include flex-row;
         @include flex-group-left;

         flex: 1;
         gap: var(--titan-spacing-standard);
         overflow: hidden;
         white-space: nowrap;
      }

      .chevron {
         transition: transform 0.15s ease;

         &.open {
            transform: rotate(180deg);
         }
      }
   }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/Select.test.js`
Expected: PASS (all four tests).

- [ ] **Step 5: Run the full unit suite to check for regressions**

Run: `npm test`
Expected: All green (≥ 289 + the new tests). Any component rendering a `Select` is unaffected because the prop contract is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/input/select/Select.svelte tests/unit/Select.test.js
git commit -m "feat: rewrite Select as a custom floating combobox"
```

---

### Task 4: Wire icons into `AttributeSelect` and `AttackTypeSelect`

**Files:**
- Modify: `src/helpers/svelte-components/input/select/AttributeSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/AttackTypeSelect.svelte`
- Create: `tests/unit/AttributeAttackTypeSelectIcons.test.js`

**Interfaces:**
- Consumes: `Select` (Task 3); icon constants from `~/system/Icons.js` (`BODY_ICON`, `MIND_ICON`, `SOUL_ICON`, `MELEE_ICON`, `ACCURACY_ICON`).
- Produces: both wrappers now pass `options` as `{ value, icon }[]` so the rendered control and list show icons; `value`/`onchange`/`disabled`/`tooltip` behavior unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/AttributeAttackTypeSelectIcons.test.js`:

```js
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
import AttackTypeSelect from '~/helpers/svelte-components/input/select/AttackTypeSelect.svelte';

afterEach(() => cleanup());

describe('AttributeSelect / AttackTypeSelect icons', () => {
   it('shows the attribute icon on the trigger and in the list', async () => {
      render(AttributeSelect, { props: { value: 'body' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.querySelector('i.fa-hand-fist')).not.toBeNull();

      await fireEvent.click(trigger);
      const mind = screen.getByRole('option', { name: /mind/i });
      expect(mind.querySelector('i.fa-brain')).not.toBeNull();
   });

   it('shows the attack-type icons (melee sword, ranged bow)', async () => {
      render(AttackTypeSelect, { props: { value: 'melee' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.querySelector('i.fa-sword')).not.toBeNull();

      await fireEvent.click(trigger);
      const ranged = screen.getByRole('option', { name: /ranged/i });
      expect(ranged.querySelector('i.fa-bow-arrow')).not.toBeNull();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/AttributeAttackTypeSelectIcons.test.js`
Expected: FAIL — the wrappers still pass primitive options (no icons).

- [ ] **Step 3: Update `AttributeSelect.svelte`**

In `src/helpers/svelte-components/input/select/AttributeSelect.svelte`, add the icon import and map the options to `{ value, icon }`. Replace the imports and the `options` derived block:

```svelte
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ATTRIBUTES } from '~/system/Attributes.js';
   import AttributeInput from '~/helpers/svelte-components/input/AttributeInput.svelte';
   import { BODY_ICON, MIND_ICON, SOUL_ICON } from '~/system/Icons.js';
```

```svelte
   /** @type {object} Maps each attribute to its FontAwesome icon class. */
   const ATTRIBUTE_ICONS = {
      body: BODY_ICON,
      mind: MIND_ICON,
      soul: SOUL_ICON,
   };

   /** @type {object[]} Options for the Select component, including All / None when allowed. */
   const options = $derived.by(() => {
      // Each real attribute carries its icon; synthetic all/none entries are icon-less primitives.
      const list = ATTRIBUTES.map((attribute) => ({ value: attribute, icon: ATTRIBUTE_ICONS[attribute] }));
      if (allowAll) {
         list.unshift('all');
      }
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
```

(The `<AttributeInput>` + `<Select>` markup is unchanged.)

- [ ] **Step 4: Update `AttackTypeSelect.svelte`**

In `src/helpers/svelte-components/input/select/AttackTypeSelect.svelte`, replace the imports and `options`:

```svelte
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { ATTACK_TYPES } from '~/system/AttackTypes.js';
   import { MELEE_ICON, ACCURACY_ICON } from '~/system/Icons.js';
```

```svelte
   /** @type {object} Maps each attack type to its FontAwesome icon class (ranged uses the accuracy icon). */
   const ATTACK_TYPE_ICONS = {
      melee: MELEE_ICON,
      ranged: ACCURACY_ICON,
   };

   /** @type {object[]} Options for the Select component, each carrying its icon. */
   const options = ATTACK_TYPES.map((type) => ({ value: type, icon: ATTACK_TYPE_ICONS[type] }));
```

(The `<Select>` markup is unchanged.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/AttributeAttackTypeSelectIcons.test.js`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/input/select/AttributeSelect.svelte src/helpers/svelte-components/input/select/AttackTypeSelect.svelte tests/unit/AttributeAttackTypeSelectIcons.test.js
git commit -m "feat: show attribute and attack-type icons in their selects"
```

---

### Task 5: e2e select helpers

**Files:**
- Create: `tests/e2e/select.js`

**Interfaces:**
- Produces:
  - `selectTitanOption(page, trigger, value)` — clicks the trigger Locator open, then clicks the portaled `[role=option][data-value="<value>"]`.
  - `titanSelectOptionValues(page, trigger)` — opens the trigger, returns the `data-value` of every visible option, then closes via Escape.
  - `readTitanSelectValue(trigger)` — returns the trigger's committed `data-value`.

- [ ] **Step 1: Write the helper module**

Create `tests/e2e/select.js`:

```js
/**
 * Page-object helpers for driving the TITAN custom Select (a `role="combobox"` button that opens a
 * `role="listbox"` portaled to `document.body`). Only one list is open at a time, so option rows can
 * be matched document-wide by their `data-value`.
 */

/**
 * Opens the given Select trigger and clicks the option carrying the target value.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @param {string|number} value - The `data-value` of the option to choose.
 * @returns {Promise<void>} Resolves once the option is clicked.
 */
export async function selectTitanOption(page, trigger, value) {
   await trigger.click();
   await page.locator(`[role="option"][data-value="${value}"]`).click();
}

/**
 * Opens the given Select trigger and returns every visible option's `data-value`, then closes the list.
 * @param {import('@playwright/test').Page} page - The Playwright page.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @returns {Promise<string[]>} The option values in DOM order.
 */
export async function titanSelectOptionValues(page, trigger) {
   await trigger.click();
   // The portaled rows for the single open list.
   const values = await page.locator('[role="option"]').evaluateAll(
      (rows) => rows.map((row) => row.getAttribute('data-value')),
   );
   await page.keyboard.press('Escape');
   return values;
}

/**
 * Reads the committed value from a Select trigger.
 * @param {import('@playwright/test').Locator} trigger - The Select trigger (role=combobox).
 * @returns {Promise<string|null>} The trigger's `data-value`.
 */
export async function readTitanSelectValue(trigger) {
   return trigger.getAttribute('data-value');
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/select.js
git commit -m "test: add e2e helpers for the custom Select"
```

(No standalone test run — the helpers are exercised by Task 6.)

---

### Task 6: Migrate `component-probe-selects.spec.js` to the new DOM

**Files:**
- Modify: `tests/e2e/component-probe-selects.spec.js`

**Interfaces:**
- Consumes: the helpers from Task 5 (`selectTitanOption`, `titanSelectOptionValues`, `readTitanSelectValue`).

This file has ~14 near-identical component probes (AttributeSelect, SkillSelect, RaritySelect, RatingSelect, ResistanceSelect, ResourceSelect, SpeedSelect, ModSelect, AttackTypeSelect, CheckDifficultySelect, DamageReducedBySelect, InventoryItemTypeSelect, RulesElementOperationSelect, ArmorTraitSelect, AttackTraitSelect, ShieldTraitSelect). Apply the **same mechanical transformation** to every probe; one fully-worked example is shown, then the transformation rules to apply everywhere.

- [ ] **Step 1: Add the helper import**

At the top of `tests/e2e/component-probe-selects.spec.js`, add:

```js
import { selectTitanOption, titanSelectOptionValues, readTitanSelectValue } from './select.js';
```

- [ ] **Step 2: Transform the worked example (AttributeSelect "renders…and fires onchange")**

Replace the body after `await clearProbeEvents(page);` in the first AttributeSelect test:

```js
      // The trigger button is the role=combobox inside the mounted probe container.
      const trigger = page.locator(`${selector} [role="combobox"]`);

      const optionValues = await titanSelectOptionValues(page, trigger);
      expect(optionValues).toContain('body');
      expect(optionValues).toContain('mind');
      expect(optionValues).toContain('soul');
      expect(optionValues).toHaveLength(3);

      await selectTitanOption(page, trigger, 'mind');
      expect(await readTitanSelectValue(trigger)).toBe('mind');

      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(1);
```

- [ ] **Step 3: Apply the transformation rules to every remaining probe in the file**

For each probe test, mechanically replace the native-`<select>` interactions:

| Old (native `<select>`) | New (custom combobox) |
|---|---|
| `const select = page.locator(\`${selector} select\`);` | `const trigger = page.locator(\`${selector} [role="combobox"]\`);` |
| `await expect(select.locator('option')).not.toHaveCount(0);` | *(delete — covered by the values assertion)* |
| `const optionValues = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));` | `const optionValues = await titanSelectOptionValues(page, trigger);` |
| `const optionValues = await page.locator(\`${selector} select option\`).evaluateAll((opts) => opts.map((o) => o.value));` | `const optionValues = await titanSelectOptionValues(page, trigger);` (with `const trigger = page.locator(\`${selector} [role="combobox"]\`);` added above it) |
| `await select.selectOption('X');` | `await selectTitanOption(page, trigger, 'X');` |
| `await expect(select).toHaveValue('X');` | `expect(await readTitanSelectValue(trigger)).toBe('X');` |
| `await expect(page.locator(\`${selector} select\`)).toBeDisabled();` | `await expect(page.locator(\`${selector} [role="combobox"]\`)).toBeDisabled();` |

For the **"testId resolves on the select element"** tests: testId now lands on the trigger button (for bare selects) or remains on the wrapper div (for AttributeSelect/RaritySelect/ResistanceSelect, which wrap an `*Input` div). Update the bare-select assertions from `select[data-testid="X"]` to `[role="combobox"][data-testid="X"]`; leave the wrapper-div assertions (`[data-testid="X"]`) unchanged.

Numeric-option probes (CheckDifficultySelect) keep string comparison: `data-value` serializes numbers to strings, so `optionValues` contains `'1'`…`'6'` and `selectTitanOption(page, trigger, '3')` / `readTitanSelectValue` → `'3'` exactly as the old `selectOption('3')` / `toHaveValue('3')` did.

- [ ] **Step 4: Build, then run the migrated spec file**

The e2e suite runs against `dist/`, so rebuild first (a src change is in the bundle):

Run: `npm run build`
Expected: exit 0; no probe artifacts in the production bundle.

Run: `npm run test:e2e -- component-probe-selects`
Expected: all probes in the file PASS.

(If the world is not launched, ask the user to launch it — e2e is world-launch-gated.)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/component-probe-selects.spec.js
git commit -m "test: migrate select component probes to the custom combobox"
```

---

### Task 7: Migrate remaining e2e select interactions

**Files:**
- Modify: `tests/e2e/checkDialog.js` (`setSelectField`)
- Modify: `tests/e2e/rules-element-crud.spec.js`
- Modify: `tests/e2e/component-probe.spec.js`
- Modify: `tests/e2e/fixtures.js`

**Interfaces:**
- Consumes: the helpers from Task 5.

- [ ] **Step 1: Rewrite `setSelectField` in `checkDialog.js`**

Replace the `setSelectField` function (currently uses `select.selectOption({ label })`). The check-dialog selects are bare `Select`s whose `testId` is `check-field-<key>`, so the trigger is the `role=combobox` inside that field. The dialog options' `data-value` equals the option value; the helper selects by value, so callers must pass the value (the check fields use value-equals-label for these enum lists, so existing call sites that passed a label that equals the value still work; verify per call site):

```js
/**
 * Selects an option in a TITAN custom Select field by its value.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {string|number} value - The option value to select (equals the label for these enum fields).
 * @returns {Promise<void>} Resolves once the option is selected.
 */
export async function setSelectField(dialog, key, value) {
   // The combobox trigger inside the field wrapper.
   const trigger = dialog.getByTestId(`check-field-${key}`).locator('[role="combobox"]');
   await trigger.click();
   await dialog.page().locator(`[role="option"][data-value="${value}"]`).click();
}
```

Audit each `setSelectField(...)` call site in the e2e suite (grep `setSelectField`): where the third argument was a human label that differs from the option value, change it to the value. For attribute/resistance/skill/difficulty enums the value equals the label, so most need no change.

- [ ] **Step 2: Migrate `rules-element-crud.spec.js` and `component-probe.spec.js`**

Grep each file for `selectOption(` and `locator('select'`/`locator("select"`/` select`)`. For each occurrence, apply the same transformation as Task 6 (trigger = `[role="combobox"]`; `selectOption(v)` → `selectTitanOption(page, trigger, v)`; `toHaveValue(v)` → `readTitanSelectValue`). Add `import { selectTitanOption, readTitanSelectValue } from './select.js';` to any file that gains a usage.

Run after editing each file:

Run: `grep -n "selectOption\|locator('select'\|locator(\"select\"" tests/e2e/rules-element-crud.spec.js tests/e2e/component-probe.spec.js`
Expected: no remaining matches.

- [ ] **Step 3: Migrate `fixtures.js`**

Grep `fixtures.js` for the single `selectOption`/`select` usage and apply the same transformation. If it is a shared fixture helper, prefer routing it through `tests/e2e/select.js` rather than inlining.

Run: `grep -n "selectOption\|'select'\|\"select\"" tests/e2e/fixtures.js`
Expected: no remaining native-select matches.

- [ ] **Step 4: Rebuild and run the affected specs**

Run: `npm run build`
Expected: exit 0.

Run: `npm run test:e2e -- rules-element-crud checkDialog component-probe`
Expected: all PASS.

- [ ] **Step 5: Run the FULL e2e suite**

Run: `npm run test:e2e`
Expected: full suite green (no native-`<select>` interaction remains anywhere).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/checkDialog.js tests/e2e/rules-element-crud.spec.js tests/e2e/component-probe.spec.js tests/e2e/fixtures.js
git commit -m "test: migrate remaining e2e select interactions to the custom Select"
```

---

### Task 8: Documentation (required final step)

**Files:**
- Modify: `.claude/skills/titan-codebase/references/conventions.md` (or `abstractions.md`, whichever documents shared input components)
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update the `titan-codebase` skill**

Document the current state (not history): the shared `Select.svelte` is a custom `role="combobox"` button that mounts a `SelectList` (`role="listbox"`) portaled to `document.body` and positioned with `svelte-floating-ui`; the public contract is `{ options, value (primitive, bindable), disabled, tooltip, onchange, testId }` plus optional `icon` on `SelectOption` and `option`/`selection` snippets; the list closes on outside-click/scroll/resize; e2e drives it via `tests/e2e/select.js` (`selectTitanOption`/`titanSelectOptionValues`/`readTitanSelectValue`), matching `[role=option][data-value]` document-wide because only one list is open at a time. Note `portalToBody` lives in `src/helpers/svelte-actions/`.

- [ ] **Step 2: Log any deferred follow-up in `docs/TODO.md`**

Add one entry: the list positions once on open and closes on scroll/resize (no live reposition); if continuous reposition is later wanted, enable `svelte-floating-ui` `autoUpdate` and add a ResizeObserver no-op to `tests/setup.js` for unit mounts.

- [ ] **Step 3: Verify lint is clean**

Run: `npm run eslint && npm run stylelint`
Expected: 0 errors (note the project bans `:global`; none was introduced).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/titan-codebase docs/TODO.md
git commit -m "docs: record the custom Select architecture"
```

---

## Buddy-check directives

This change rewrites a primitive consumed by ~37 wrappers and migrates the full e2e select surface — broad blast radius. **Recommended:** run a `buddy-checking` pass on the final branch (two independent blind reviewers, reconciled) instead of a single review, focusing on (a) the value-clamp/`onchange` parity vs. the old native `Select`, (b) outside-click/scroll close behavior across portaled lists inside ApplicationV2 windows, and (c) completeness of the e2e migration (no native `<select>` interaction left). The execution-handoff question offers this explicitly.

## Self-Review

**Spec coverage:**
- Base `Select` rewrite, contract preserved, clamp preserved → Task 3. ✓
- Lift/adapt package positioning, strip machinery → Tasks 1–3 (`svelte-floating-ui`, no search/multi/clear/async/grouping). ✓
- `@floating-ui/dom` via `svelte-floating-ui` dependency → Task 1. ✓
- Portal to `document.body` (theme tokens on `:root`) → Task 1 + Task 2. ✓
- `SelectOption.icon` + `option`/`selection` snippets, no accent field → Task 3. ✓
- Icons for AttributeSelect/AttackTypeSelect from `Icons.js`; `Document*` inherit → Task 4. ✓
- Keyboard/a11y parity (arrows/Home/End/Enter/Space/Esc/Tab/typeahead, aria) → Task 3. ✓
- e2e migration (`component-probe-selects`, `checkDialog`, `rules-element-crud`, `component-probe`, `fixtures`) + centralized helper → Tasks 5–7. ✓
- Docs (titan-codebase skill + TODO) → Task 8. ✓
- Non-goals (search/multi/clear/async/grouping) excluded → not implemented. ✓

**Placeholder scan:** No TBD/TODO-in-code; the one SCSS-token caveat in Task 2 names a concrete fallback action (grep `src/theme`, use `var(--x, fallback)`). No "similar to Task N" — the e2e migration provides a worked example + an explicit transformation table.

**Type consistency:** `toOption`/`normalized`/`selected`/`commit`/`close`/`open` used consistently in Task 3; `selectTitanOption`/`titanSelectOptionValues`/`readTitanSelectValue` signatures match between Task 5 (definition) and Tasks 6–7 (use); `SelectOption.icon` defined in Task 3 and consumed in Tasks 2 and 4.
