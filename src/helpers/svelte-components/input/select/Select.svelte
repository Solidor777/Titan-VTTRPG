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

      // The index of the selected option, defaulting to the first row when none matches.
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
      // The option count, used to wrap the highlight index.
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
