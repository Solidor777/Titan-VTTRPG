<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import buildActionMenuModel from '~/ui/player-hud/elements/action-menu/BuildActionMenuModel.js';
   import HudAmountDialog from '~/ui/player-hud/elements/action-menu/HudAmountDialog.js';
   import ActionMenuFlyout from '~/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte';
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';

   /**
    * @typedef {object} ActionMenuElementProps
    * @property {Array<Actor>} actors - All resolved actors (group actions iterate these).
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {object} options - The actionMenu options.
    * @property {string} chipCorner - The minimize-chip corner ('top-right' | 'top-left' | 'bottom-right' | 'bottom-left'), so the category bar reserves its gutter on the chip's side.
    */

   /** @type {ActionMenuElementProps} */
   const { actors, layoutState, options, chipCorner } = $props();

   /** @type {object} The primary actor bridge (live reads keep the model reactive). */
   const document = getContext('document');

   /** @type {object} Apply sub-option key → CharacterDataModel method name. */
   const APPLY_METHODS = {
      applyDamage: 'applyDamage',
      applyHealing: 'applyHealing',
      applyRend: 'applyRend',
      applyRepairs: 'applyRepairs',
   };

   /** @type {Array<string>} Sub-button key prefixes that keep the cascade open after clicking. */
   const KEEP_OPEN_PREFIXES = ['equipped', 'quantity-', 'duration-', 'remove'];

   /** @type {HTMLElement | undefined} The element root, for click-away containment checks. */
   let rootEl = $state();

   /** @type {HTMLElement | undefined} The category bar, anchoring the active-button offset measurements. */
   let barEl = $state();

   /** @type {number} The active category button's offset along the bar (horizontal alignment). */
   let activeOffset = $state(0);

   /** @type {number} The active category button's top within the bar (vertical anchoring). */
   let activeTop = $state(0);

   /** @type {number} The active category button's height, anchoring the flyout's first row. */
   let activeHeight = $state(0);

   /** @type {boolean} Whether the categories stack vertically. */
   const vertical = $derived(options.layout === 'vertical');

   /** @type {boolean} Whether vertical sub-options stack upward (first row on the button, rest above). */
   const flowUp = $derived(vertical && options.directions.vertical.subOptionsFlow === 'up');

   /** @type {Array<object>} The menu model with the amount-prompt utilities wired to the dialog. */
   const model = $derived.by(() => {
      return buildActionMenuModel({ actors, primary: document.data, options }).map((entry) => {
         if (entry.key !== 'utility') {
            return entry;
         }
         return {
            ...entry,
            subOptions: entry.subOptions.map((sub) => {
               if (!sub.amountPrompt) {
                  return sub;
               }
               return {
                  ...sub,
                  mainAction: () => {
                     new HudAmountDialog(sub.labelKey, (amount) => {
                        for (const actor of actors) {
                           actor.system[APPLY_METHODS[sub.key]](amount, {});
                        }
                     }).render(true);
                  },
               };
            }),
         };
      });
   });

   /** @type {object | null} The open category's model entry. */
   const openCategory = $derived(model.find((entry) => entry.key === layoutState.openCategory) ?? null);

   // Re-measure the active button's position whenever the open category changes, so the flyout lane
   // aligns to it: horizontally in a horizontal layout, vertically (top + height) in a vertical one.
   $effect(() => {
      void layoutState.openCategory;
      // Orientation and flow change which edge of the button the lane anchors to, so re-measure when
      // they change while a category is open.
      void vertical;
      void flowUp;

      /** @type {HTMLElement | null} The open category's button, when one is open. */
      const active = barEl?.querySelector('.active') ?? null;
      activeOffset = active?.offsetLeft ?? 0;
      activeTop = active?.offsetTop ?? 0;
      activeHeight = active?.offsetHeight ?? 0;
   });

   /**
    * @type {string} The sub-option lane side: 'before' (left/up) or 'after' (right/down). The
    * configured direction is authoritative — the lane always opens toward the chosen side.
    */
   const subOptionsSide = $derived(
      vertical
         ? (options.directions.vertical.subOptions === 'left' ? 'before' : 'after')
         : (options.directions.horizontal.subOptions === 'up' ? 'before' : 'after'),
   );

   /**
    * @type {string} The sub-button lane side within the flyout: 'before' (left) or 'after' (right).
    * In a vertical layout the sub-buttons follow the sub-option direction; in a horizontal layout
    * they use their own configured side. The configured direction is authoritative (no auto-flip).
    */
   const subButtonsSide = $derived(
      vertical
         ? subOptionsSide
         : (options.directions.horizontal.subButtons === 'left' ? 'before' : 'after'),
   );

   /**
    * @type {'top' | 'right' | 'bottom' | 'left'} The edge the open category's accent bar sits on,
    * facing the flyout: left/right in a vertical layout, top/bottom in a horizontal one.
    */
   const accentEdge = $derived.by(() => {
      if (vertical) {
         return subOptionsSide === 'before' ? 'left' : 'right';
      }
      return subOptionsSide === 'before' ? 'top' : 'bottom';
   });

   /**
    * Runs a clicked entry's action and closes the cascade unless the entry is an in-place toggle
    * (equip, quantity, duration, remove), which keeps the menu open for repeat use.
    * @param {string} kind - 'main' for sub-option rows, 'sub' for sub-buttons.
    * @param {object} entry - The clicked sub-option or sub-button.
    * @returns {void}
    */
   function onAction(kind, entry) {
      if (kind === 'main') {
         entry.mainAction();
         layoutState.openCategory = null;
         return;
      }
      entry.action();
      if (!KEEP_OPEN_PREFIXES.some((prefix) => entry.key === prefix || entry.key.startsWith(prefix))) {
         layoutState.openCategory = null;
      }
   }

   /**
    * Closes the cascade when a press lands outside the menu.
    * @param {PointerEvent} event - The window-level pointer event (capture phase).
    * @returns {void}
    */
   function onWindowPointerDown(event) {
      if (layoutState.openCategory && rootEl && !rootEl.contains(event.target)) {
         layoutState.openCategory = null;
      }
   }

   /**
    * Closes the cascade on Escape, consuming the event so Foundry's core Escape handling (which
    * releases token control and would unmount the whole HUD) only fires when no cascade is open.
    * @param {KeyboardEvent} event - The window-level keyboard event (capture phase).
    * @returns {void}
    */
   function onWindowKeyDown(event) {
      if (event.key === 'Escape' && layoutState.openCategory) {
         layoutState.openCategory = null;
         event.preventDefault();
         event.stopImmediatePropagation();
      }
   }
</script>

<svelte:window
   onpointerdowncapture={onWindowPointerDown}
   onkeydowncapture={onWindowKeyDown}
/>

<div
   class={`action-menu chip-${chipCorner}`}
   class:vertical
   class:flyout-before={subOptionsSide === 'before'}
   class:flyout-after={subOptionsSide === 'after'}
   bind:this={rootEl}
>
   {#if openCategory}
      {#key openCategory.key}
         <div
            class="flyout-lane"
            class:anchored={vertical}
            class:before={vertical && subOptionsSide === 'before'}
            class:after={vertical && subOptionsSide === 'after'}
            style:order={subOptionsSide === 'before' ? 0 : 2}
            style:margin-left={!vertical && activeOffset > 0 ? `${activeOffset}px` : null}
            style:top={vertical && !flowUp ? `${activeTop}px` : null}
            style:bottom={vertical && flowUp ? `calc(100% - ${activeTop + activeHeight}px)` : null}
         >
            <ActionMenuFlyout
               category={openCategory}
               windowSize={options.windowSize}
               {vertical}
               {flowUp}
               {subOptionsSide}
               {subButtonsSide}
               {onAction}
            />
         </div>
      {/key}
   {/if}
   <div
      class="categories"
      style:order={1}
      bind:this={barEl}
   >
      {#each model as entry (entry.key)}
         <HudButton
            variant="category"
            active={layoutState.openCategory === entry.key}
            accentEdge={layoutState.openCategory === entry.key ? accentEdge : undefined}
            testId={`player-hud-category-${entry.key}`}
            onclick={() => {
               layoutState.openCategory = layoutState.openCategory === entry.key ? null : entry.key;
            }}
         >
            {localize(entry.labelKey)}
         </HudButton>
      {/each}
   </div>
</div>

<style lang="scss">
   .action-menu {
      @include flex-column;
      @include flex-group-top;

      gap: var(--titan-spacing-standard);
      align-items: flex-start;

      &.vertical {
         @include flex-row;

         position: relative;
         align-items: flex-start;
      }

      .flyout-lane {
         flex-shrink: 0;

         // In a vertical layout the lane is lifted out of flow and anchored beside the category
         // column at the open button's row, so opening a category never reflows the bar.
         &.anchored {
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

      .categories {
         @include flex-row;
         @include flex-group-left;

         gap: 2px;
      }

      // Reserve a gutter on the chip's own corner so the minimize chip never overlaps the categories.
      &.chip-top-right .categories,
      &.chip-bottom-right .categories {
         padding-right: 22px;
      }

      &.chip-top-left .categories,
      &.chip-bottom-left .categories {
         padding-left: 22px;
      }

      &.vertical .categories {
         @include flex-column;
         @include flex-group-top;

         // Stretch the category buttons to the column width (they are content-width on their own).
         align-items: stretch;
      }

      // In a vertical layout the chip sits at a bottom corner, so the gutter is reserved below.
      &.vertical.chip-bottom-right .categories,
      &.vertical.chip-bottom-left .categories {
         padding-right: 0;
         padding-left: 0;
         padding-bottom: 18px;
      }
   }
</style>
