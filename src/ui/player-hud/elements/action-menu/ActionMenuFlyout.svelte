<script>
   import ActionMenuSubOption from '~/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte';
   import ActionMenuSubButtons from '~/ui/player-hud/elements/action-menu/ActionMenuSubButtons.svelte';

   /**
    * @typedef {object} ActionMenuFlyoutProps
    * @property {object} category - The open category whose sub-options are shown.
    * @property {number} windowSize - The maximum number of sub-options visible before scrolling.
    * @property {string} subButtonsSide - The sub-button lane side: 'before' (left) or 'after' (right).
    * @property {Function} onAction - Receives ('main'|'sub', entry) for every click.
    */

   /** @type {ActionMenuFlyoutProps} */
   const { category, windowSize, subButtonsSide, onAction } = $props();

   /** @type {number} The first visible sub-option index of the scroll window. */
   let windowStart = $state(0);

   /** @type {string | null} The hovered/focused sub-option key, whose sub-buttons are revealed. */
   let hoveredKey = $state(null);

   /** @type {number} The hovered row's top offset, aligning the sub-button lane to it. */
   let hoveredOffset = $state(0);

   /** @type {number} The highest valid scroll-window start. */
   const maxStart = $derived(Math.max(0, category.subOptions.length - windowSize));

   /** @type {Array<object>} The visible sub-option window. */
   const visible = $derived(category.subOptions.slice(windowStart, windowStart + windowSize));

   /** @type {object | null} The sub-option whose sub-buttons are revealed, when still visible. */
   const hovered = $derived(visible.find((sub) => sub.key === hoveredKey) ?? null);

   /**
    * Action attaching a non-passive wheel listener (Svelte's wheel attribute is passive, which
    * would forbid the preventDefault needed to keep the canvas from zooming under the menu).
    * @param {HTMLElement} node - The scrollable sub-option lane.
    * @returns {{destroy: Function}} The action handle removing the listener.
    */
   function wheelScroll(node) {
      /**
       * Steps the scroll window by one sub-option per wheel tick.
       * @param {WheelEvent} event - Carries the wheel direction in deltaY.
       * @returns {void}
       */
      const onWheel = (event) => {
         if (maxStart === 0) {
            return;
         }
         event.preventDefault();
         windowStart = Math.min(maxStart, Math.max(0, windowStart + (event.deltaY > 0 ? 1 : -1)));
      };

      node.addEventListener('wheel', onWheel, { passive: false });
      return { destroy: () => node.removeEventListener('wheel', onWheel) };
   }

   /**
    * Reveals a sub-option's sub-buttons and aligns the lane to its row.
    * @param {object} sub - The hovered/focused sub-option.
    * @param {Event} event - The triggering pointer/focus event.
    * @returns {void}
    */
   function reveal(sub, event) {
      hoveredKey = sub.key;
      hoveredOffset = event.currentTarget.offsetTop;
   }
</script>

<div class="flyout">
   {#if hovered && hovered.subButtons.length > 0}
      <div
         class="sub-buttons-lane"
         style:order={subButtonsSide === 'before' ? 0 : 2}
         style:margin-top={`${hoveredOffset}px`}
      >
         <ActionMenuSubButtons
            subOption={hovered}
            {onAction}
         />
      </div>
   {/if}
   <div
      class="sub-options"
      style:order={1}
      data-testid="player-hud-flyout"
      use:wheelScroll
   >
      {#if windowStart > 0}
         <div
            class="scroll-indicator"
            data-testid="player-hud-flyout-up"
         >
            <i class="fas fa-chevron-up"></i>
         </div>
      {/if}
      {#each visible as sub (sub.key)}
         <ActionMenuSubOption
            {sub}
            categoryKey={category.key}
            {onAction}
            onreveal={reveal}
         />
      {/each}
      {#if windowStart < maxStart}
         <div
            class="scroll-indicator"
            data-testid="player-hud-flyout-down"
         >
            <i class="fas fa-chevron-down"></i>
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   .flyout {
      @include flex-row;
      @include flex-group-top;

      gap: var(--titan-spacing-standard);
      align-items: flex-start;

      .sub-buttons-lane {
         flex-shrink: 0;
      }

      .sub-options {
         @include flex-column;
         @include flex-group-top;

         gap: 2px;

         .scroll-indicator {
            @include font-size-small;

            width: 100%;
            text-align: center;
            opacity: 0.6;
         }
      }
   }
</style>
