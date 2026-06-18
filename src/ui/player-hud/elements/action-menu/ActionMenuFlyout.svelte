<script>
   import { fly } from 'svelte/transition';
   import ActionMenuSubOption from '~/ui/player-hud/elements/action-menu/ActionMenuSubOption.svelte';
   import ActionMenuSubButtons from '~/ui/player-hud/elements/action-menu/ActionMenuSubButtons.svelte';

   /**
    * @typedef {object} ActionMenuFlyoutProps
    * @property {object} category - The open category whose sub-options are shown.
    * @property {number} windowSize - The maximum number of sub-options visible before scrolling.
    * @property {boolean} vertical - Whether the menu uses a vertical layout (sub-options slide on the x axis).
    * @property {boolean} flowUp - Whether the vertical sub-options stack upward (reversed render, bottom-anchored).
    * @property {string} subOptionsSide - The sub-option lane side: 'before' (left/up) or 'after' (right/down).
    * @property {string} subButtonsSide - The sub-button lane side: 'before' (left) or 'after' (right).
    * @property {Function} onAction - Receives ('main'|'sub', entry) for every click.
    */

   /** @type {ActionMenuFlyoutProps} */
   const { category, windowSize, vertical, flowUp, subOptionsSide, subButtonsSide, onAction } = $props();

   /**
    * @type {'start' | 'end'} Sub-option label alignment: the opposite of the category in the vertical
    * dock (flyout-left → labels hug the right/end toward the categories), so the cascade reads
    * connected; horizontal keeps the default.
    */
   const subOptionAlign = $derived(vertical && subOptionsSide === 'before' ? 'end' : 'start');

   /** @type {number} The sub-button lane swoosh distance, in pixels. */
   const SUB_BUTTON_SWOOSH_DISTANCE = 24;

   /** @type {number} The sub-button lane swoosh duration, in milliseconds. */
   const SUB_BUTTON_SWOOSH_DURATION = 180;

   /**
    * @type {object} The sub-button lane entrance: a horizontal slide+fade emerging from the sub-option
    * toward the lane's side ('before' lane sits left → slides left from a positive offset; 'after' lane
    * sits right → slides right from a negative offset).
    */
   const subButtonFly = $derived({
      x: subButtonsSide === 'before' ? SUB_BUTTON_SWOOSH_DISTANCE : -SUB_BUTTON_SWOOSH_DISTANCE,
      duration: SUB_BUTTON_SWOOSH_DURATION,
   });

   /** @type {number} The first visible sub-option index of the scroll window. */
   let windowStart = $state(0);

   /** @type {string | null} The hovered/focused sub-option key, whose sub-buttons are revealed. */
   let hoveredKey = $state(null);

   /** @type {number} The hovered row's top offset, aligning the sub-button lane to it. */
   let hoveredOffset = $state(0);

   /** @type {number} The sub-option column's measured height. */
   let columnHeight = $state(0);

   /** @type {number} The sub-button lane's measured height. */
   let laneHeight = $state(0);

   /**
    * @type {number} The lane's clamped top: row-aligned, but never past the column's bottom (a
    * lane spilling below a bottom-anchored menu would land off-screen).
    */
   const laneTop = $derived(Math.min(hoveredOffset, columnHeight - laneHeight));

   /** @type {number} The highest valid scroll-window start. */
   const maxStart = $derived(Math.max(0, category.subOptions.length - windowSize));

   /** @type {Array<object>} The visible sub-option window. */
   const visible = $derived(category.subOptions.slice(windowStart, windowStart + windowSize));

   /**
    * @type {Array<object>} The window in render order — reversed when stacking upward so the first
    * logical option is the bottom-most row, landing on the open category button.
    */
   const rendered = $derived(flowUp ? [...visible].reverse() : visible);

   /** @type {object | null} The sub-option whose sub-buttons are revealed, when still visible. */
   const hovered = $derived(visible.find((sub) => sub.key === hoveredKey) ?? null);

   /**
    * @type {boolean} Whether hidden sub-options sit above the visible window, marked by a fade.
    * Flowing up reverses the render order, so the logically-later (off-window-end) entries are the
    * ones hidden above.
    */
   const fadeAbove = $derived(flowUp ? windowStart < maxStart : windowStart > 0);

   /** @type {boolean} Whether hidden sub-options sit below the visible window, marked by a fade. */
   const fadeBelow = $derived(flowUp ? windowStart > 0 : windowStart < maxStart);

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

         // Flowing up reverses the render order, so a wheel-down tick must walk the window the other
         // way to keep scrolling visually consistent with the cursor's direction.
         const step = (event.deltaY > 0 ? 1 : -1) * (flowUp ? -1 : 1);
         windowStart = Math.min(maxStart, Math.max(0, windowStart + step));
      };

      node.addEventListener('wheel', onWheel, { passive: false });
      return { destroy: () => node.removeEventListener('wheel', onWheel) };
   }

   /**
    * Reveals a sub-option's sub-buttons and aligns the lane to its row. Driven by pointer movement over
    * the row (not boundary entry), so the flyout swooshing in under a stationary cursor never auto-opens
    * a sub-option — only a genuine hover or keyboard focus does.
    * @param {object} sub - The moved-over/focused sub-option.
    * @param {Event} event - The triggering pointer-move or focus event.
    * @returns {void}
    */
   function reveal(sub, event) {
      hoveredKey = sub.key;
      hoveredOffset = event.currentTarget.offsetTop;
   }
</script>

<div
   class="sub-options"
   data-testid="player-hud-flyout"
   bind:clientHeight={columnHeight}
   use:wheelScroll
>
   {#each rendered as sub (sub.key)}
      <ActionMenuSubOption
         {sub}
         categoryKey={category.key}
         active={sub.key === hoveredKey}
         align={subOptionAlign}
         {onAction}
         onreveal={reveal}
      />
   {/each}

   <!--Scroll fades mark hidden entries above/below the window without affecting layout.-->
   {#if fadeAbove}
      <span
         class="overflow top"
         data-testid="player-hud-flyout-up"
      ></span>
   {/if}
   {#if fadeBelow}
      <span
         class="overflow bottom"
         data-testid="player-hud-flyout-down"
      ></span>
   {/if}

   <!--The sub-button lane overlays beside the column so revealing it never reflows the menu.-->
   {#if hovered && hovered.subButtons.length > 0}
      <div
         class="sub-buttons-lane"
         class:before={subButtonsSide === 'before'}
         class:after={subButtonsSide === 'after'}
         style:top={`${laneTop}px`}
         bind:clientHeight={laneHeight}
         in:fly={subButtonFly}
      >
         <ActionMenuSubButtons
            subOption={hovered}
            {onAction}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .sub-options {
      @include flex-column;
      @include flex-group-top;

      position: relative;

      // Grow to the longest sub-option label rather than clipping it.
      width: max-content;
      gap: 2px;

      .overflow {
         position: absolute;
         width: 100%;
         height: 12px;
         pointer-events: none;

         &.top {
            top: 0;
            background: linear-gradient(to bottom, var(--titan-panel-1-background), transparent);
         }

         &.bottom {
            bottom: 0;
            background: linear-gradient(to top, var(--titan-panel-1-background), transparent);
         }
      }

      .sub-buttons-lane {
         position: absolute;
         z-index: 1;

         &.before {
            right: calc(100% + var(--titan-spacing-standard));
         }

         &.after {
            left: calc(100% + var(--titan-spacing-standard));
         }
      }
   }
</style>
