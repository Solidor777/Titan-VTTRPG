<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /**
    * @typedef {object} CharacterSheetTabHeaderButtonProps
    * @property {string} [label] The label text for the button.
    * @property {string} [icon] The icon class for the button.
    * @property {boolean} [disabled] Whether the button is disabled.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] Callback invoked when the button is clicked.
    */

   /** @type {CharacterSheetTabHeaderButtonProps} */
   const { label = undefined, icon = undefined, disabled = undefined, onclick = undefined } = $props();
</script>

<MiniButton {disabled} {onclick}>
   <div class="label">
      {#if icon}
         <i class={icon}></i>
      {/if}
      <div>
         {label}
      </div>
   </div>
</MiniButton>

<style lang="scss">

   .label {
      @include flex-row;
      @include flex-group-center;

      i {
         @include margin-right-standard;
      }
   }
</style>
