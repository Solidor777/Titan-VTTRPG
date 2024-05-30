<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';

   export let icon = void 0;
   export let disabled = false;
</script>

<button {disabled} on:click on:mousedown={preventDefault}>
   <div><i class={icon}/></div>
</button>

<style lang="scss">
   button {
      @include icon-button;

      cursor: pointer;

      --titan-icon-button-font-size: var(--titan-font-size-small);
      --icon-button-line-height: normal;
      --titan-icon-button-radius: 20px;
   }

   button:hover {
      background: radial-gradient(
            var(--titan-button-background-highlight),
            var(--titan-button-background)
      );
   }
</style>
