<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /** @type {string} */
   export let label = void 0;
   /** @type {string} */
   export let icon = void 0;
   /** @type {boolean} */
   export let disabled = void 0;
</script>

<MiniButton {disabled} on:click>
   <div class="label">
      {#if icon}
         <i class={icon}/>
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
