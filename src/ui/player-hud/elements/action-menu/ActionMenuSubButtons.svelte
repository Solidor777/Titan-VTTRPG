<script>
   import HudButton from '~/helpers/svelte-components/button/HudButton.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ActionMenuSubButtonsProps
    * @property {object} subOption - The sub-option whose sub-buttons are shown.
    * @property {Function} onAction - Receives ('sub', button) when a sub-button is clicked.
    */

   /** @type {ActionMenuSubButtonsProps} */
   const { subOption, onAction } = $props();
</script>

<div class="sub-buttons">
   {#each subOption.subButtons as button (button.key)}
      <HudButton
         variant="sub-button"
         testId={`player-hud-sub-button-${subOption.key}-${button.key}`}
         onclick={() => onAction('sub', button)}
      >
         {#if button.icon}
            <i class={button.icon}></i>
         {/if}
         <span>{button.label ?? localize(button.labelKey)}</span>
      </HudButton>
   {/each}
</div>

<style lang="scss">
   .sub-buttons {
      @include flex-column;
      @include flex-group-top;

      // Grow to the longest sub-button label rather than clipping it.
      width: max-content;
      gap: 2px;
   }
</style>
