<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";

   export let click = void 0;
</script>

<button on:click on:mousedown={preventDefault}>
   <slot />
</button>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   button {
      @include flex-row;
      @include flex-group-center;
      padding: 0;
      margin: 0;
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      height: 100%;
      font-weight: bold;
      font-size: 1rem;
   }
   button:hover {
      outline: none;
      text-shadow: 0 0 8px var(--color-shadow-primary);
      box-shadow: none;
   }
</style>
