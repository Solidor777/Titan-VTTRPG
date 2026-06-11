<script>
   import { fly } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ActionMenuSubOptionProps
    * @property {object} sub - The sub-option to render.
    * @property {string} categoryKey - The owning category's key (for the test selector).
    * @property {object} [flyIn] - The `svelte/transition` fly parameters for the row's slide-in entrance.
    * @property {Function} onAction - Receives ('main', sub) when the row is clicked.
    * @property {Function} onreveal - Receives (sub, event) when the row is hovered or focused.
    */

   /** @type {ActionMenuSubOptionProps} */
   const { sub, categoryKey, flyIn = {}, onAction, onreveal } = $props();
</script>

<button
   class="sub-option"
   type="button"
   data-testid={`player-hud-sub-option-${categoryKey}-${sub.key}`}
   in:fly={flyIn}
   onclick={() => onAction('main', sub)}
   onpointerenter={(event) => onreveal(sub, event)}
   onfocus={(event) => onreveal(sub, event)}
>
   {#if sub.img}
      <img
         src={sub.img}
         alt=""
      />
   {/if}
   <span>{sub.label ?? localize(sub.labelKey)}</span>
</button>

<style lang="scss">
   .sub-option {
      @include panel-2;
      @include flex-row;
      @include flex-group-left;
      @include font-size-small;

      width: 100%;
      gap: var(--titan-spacing-standard);
      padding: 3px var(--titan-spacing-standard);
      border: none;
      border-radius: var(--titan-border-radius);
      color: inherit;
      cursor: pointer;
      white-space: nowrap;

      img {
         width: 20px;
         height: 20px;
         object-fit: contain;
      }
   }
</style>
