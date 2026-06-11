<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import buildActionMenuModel from '~/ui/player-hud/elements/action-menu/BuildActionMenuModel.js';
   import HudAmountDialog from '~/ui/player-hud/elements/action-menu/HudAmountDialog.js';
   import ActionMenuFlyout from '~/ui/player-hud/elements/action-menu/ActionMenuFlyout.svelte';
   import { resolveCascadeDirection } from '~/ui/player-hud/HudGeometry.js';

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

   /** @type {DOMRect | null} The category bar's box, measured when the open category changes. */
   let barBox = $state(null);

   /** @type {number} The active category button's offset along the bar (horizontal alignment). */
   let activeOffset = $state(0);

   /** @type {number} The flyout lane's measured width. */
   let flyoutWidth = $state(0);

   /** @type {number} The flyout lane's measured height. */
   let flyoutHeight = $state(0);

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

   // Re-measure the bar and the active button whenever the cascade opens or the rect changes.
   $effect(() => {
      void layoutState.openCategory;
      void layoutState.rect;
      barBox = barEl?.getBoundingClientRect() ?? null;
      activeOffset = barEl?.querySelector('.active')?.offsetLeft ?? 0;
   });

   /** @type {string} The sub-option lane side: 'before' (left/up) or 'after' (right/down). */
   const subOptionsSide = $derived.by(() => {
      /** @type {string} The configured preference mapped onto the lane axis. */
      const preferred = vertical
         ? (options.directions.vertical.subOptions === 'left' ? 'before' : 'after')
         : (options.directions.horizontal.subOptions === 'up' ? 'before' : 'after');
      if (!barBox) {
         return preferred;
      }
      return vertical
         ? resolveCascadeDirection({
            preferred,
            spaceBefore: barBox.left - layoutState.rect.left,
            spaceAfter: layoutState.rect.left + layoutState.rect.width - barBox.right,
            required: flyoutWidth,
         })
         : resolveCascadeDirection({
            preferred,
            spaceBefore: barBox.top - layoutState.rect.top,
            spaceAfter: layoutState.rect.top + layoutState.rect.height - barBox.bottom,
            required: flyoutHeight,
         });
   });

   /** @type {string} The sub-button lane side within the flyout: 'before' (left) or 'after' (right). */
   const subButtonsSide = $derived.by(() => {
      /** @type {string} The configured preference mapped onto the horizontal lane axis. */
      const preferred = (vertical
         ? options.directions.vertical.subButtons
         : options.directions.horizontal.subButtons) === 'left' ? 'before' : 'after';
      if (!barBox) {
         return preferred;
      }
      return resolveCascadeDirection({
         preferred,
         spaceBefore: barBox.left - layoutState.rect.left,
         spaceAfter: layoutState.rect.left + layoutState.rect.width - barBox.right,
         required: 140,
      });
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
            bind:clientWidth={flyoutWidth}
            bind:clientHeight={flyoutHeight}
         >
            <ActionMenuFlyout
               category={openCategory}
               windowSize={options.windowSize}
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

         button {
            width: 100%;
            text-align: right;
         }
      }
   }
</style>
