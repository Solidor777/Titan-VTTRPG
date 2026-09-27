<script>
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ActionMenuSubOptionProps
    * @property {object} sub - The sub-option to render.
    * @property {string} categoryKey - The owning category's key (for the test selector).
    * @property {boolean} [active] - Whether this row is the hovered/revealed one (accent highlight).
    * @property {'start' | 'end'} [align] - Label alignment (right-aligned in the vertical dock).
    * @property {Function} onAction - Receives ('main', sub) when the row is clicked.
    * @property {Function} onreveal - Receives (sub, event) when the row is hovered or focused.
    */

   /** @type {ActionMenuSubOptionProps} */
   const { sub, categoryKey, active = false, align = 'start', onAction, onreveal } = $props();
</script>

<HudButton
   variant="sub-option"
   {active}
   {align}
   pressed={sub.pressed}
   testId={`player-hud-sub-option-${categoryKey}-${sub.key}`}
   onclick={() => onAction('main', sub)}
   onpointermove={(event) => onreveal(sub, event)}
   onfocus={(event) => onreveal(sub, event)}
>
   {#if sub.icon}
      <i class={sub.icon}></i>
   {:else if sub.img}
      <img
         src={sub.img}
         alt=""
      />
   {/if}
   <span>{sub.label ?? localize(sub.labelKey)}</span>
</HudButton>

<style lang="scss">
   // Icons take the same 20px box as item images so every row's label starts at the same x.
   // Pressed toggles paint the icon in the accent color handed down by HudButton.
   i {
      width: 20px;
      text-align: center;
      color: var(--titan-hud-button-icon-color, inherit);
   }

   img {
      width: 20px;
      height: 20px;
      object-fit: contain;
   }
</style>
