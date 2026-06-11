<script>
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
      <button
         type="button"
         data-testid={`player-hud-sub-button-${subOption.key}-${button.key}`}
         onclick={() => onAction('sub', button)}
      >
         {#if button.icon}
            <i class={button.icon}></i>
         {/if}
         <span>{button.label ?? localize(button.labelKey)}</span>
      </button>
   {/each}
</div>

<style lang="scss">
   .sub-buttons {
      @include flex-column;
      @include flex-group-top;

      gap: 2px;

      button {
         @include panel-3;
         @include flex-row;
         @include flex-group-left;
         @include font-size-small;

         width: 100%;
         gap: var(--titan-spacing-standard);
         padding: 2px var(--titan-spacing-standard);
         border: none;
         border-radius: var(--titan-border-radius);
         color: inherit;
         cursor: pointer;
         white-space: nowrap;
      }
   }
</style>
