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
      // The currently highlighted option row, resolved by its generated id.
      const active = listEl?.querySelector(`#${CSS.escape(`${listId}-option-${hoverIndex}`)}`);
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
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

      // Portaled to <body>; sits above Foundry sheets and overlays as a transient dropdown.
      position: absolute;
      z-index: 10000;
      max-height: 16rem;
      overflow-y: auto;
      padding: 2px;
      border: var(--titan-input-border);
      border-radius: var(--titan-input-border-radius);
      background: var(--titan-panel-1-background);
      box-shadow: 0 4px 12px rgb(0 0 0 / 40%);

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
