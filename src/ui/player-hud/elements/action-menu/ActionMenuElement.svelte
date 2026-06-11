<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import buildActionMenuModel from '~/ui/player-hud/elements/action-menu/BuildActionMenuModel.js';
   import HudAmountDialog from '~/ui/player-hud/elements/action-menu/HudAmountDialog.js';
   import ActionMenuFlyout from '~/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte';

   /**
    * @typedef {object} ActionMenuElementProps
    * @property {Array<Actor>} actors - All resolved actors (group actions iterate these).
    * @property {HudLayoutState} layoutState - Shared layout/UI state.
    * @property {object} options - The actionMenu options.
    */

   /** @type {ActionMenuElementProps} */
   const { actors, layoutState, options } = $props();

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

   /** @type {HTMLElement | undefined} The category bar, anchoring the cascade flip measurements. */
   let barEl = $state();

   /** @type {number} The active category button's offset along the bar (horizontal alignment). */
   let activeOffset = $state(0);

   /** @type {boolean} Whether the categories stack vertically. */
   const vertical = $derived(options.layout === 'vertical');

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

   // Re-measure the active button's offset whenever the open category changes, so the horizontal
   // flyout lane aligns under it.
   $effect(() => {
      void layoutState.openCategory;
      activeOffset = barEl?.querySelector('.active')?.offsetLeft ?? 0;
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
   class="action-menu"
   class:vertical
   bind:this={rootEl}
>
   {#if openCategory}
      {#key openCategory.key}
         <div
            class="flyout-lane"
            style:order={subOptionsSide === 'before' ? 0 : 2}
            style:margin-left={!vertical && activeOffset > 0 ? `${activeOffset}px` : null}
         >
            <ActionMenuFlyout
               category={openCategory}
               windowSize={options.windowSize}
               {vertical}
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
         <button
            type="button"
            class:active={layoutState.openCategory === entry.key}
            data-testid={`player-hud-category-${entry.key}`}
            onclick={() => {
               layoutState.openCategory = layoutState.openCategory === entry.key ? null : entry.key;
            }}
         >
            {localize(entry.labelKey)}
         </button>
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

         align-items: flex-end;
      }

      .flyout-lane {
         flex-shrink: 0;
      }

      .categories {
         @include flex-row;
         @include flex-group-left;

         gap: 2px;

         // Reserve a gutter so the minimize chip clears the buttons: in a horizontal layout the chip
         // sits at the right; in a vertical layout it sits at the bottom (see actionMenuChipCorner).
         padding-right: 22px;

         button {
            @include panel-2;
            @include font-size-small;

            padding: 3px var(--titan-spacing-standard);
            border: none;
            border-radius: var(--titan-border-radius);
            color: inherit;
            cursor: pointer;
            white-space: nowrap;

            &.active {
               @include panel-3;
            }
         }
      }

      &.vertical .categories {
         @include flex-column;
         @include flex-group-top;

         padding-right: 0;
         padding-bottom: 18px;

         button {
            width: 100%;
            text-align: right;
         }
      }
   }
</style>
