<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';

   export let icon = void 0;
   export let disabled = false;
</script>

<button on:click on:mousedown={preventDefault} {disabled}>
   <i class={icon} />
</button>

<style lang="scss">
   button {
      @include icon-button;

      i {
         margin-right: 0;
      }
   }
</style>
