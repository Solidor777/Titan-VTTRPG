<script>
   import preventDefault from "~/helpers/svelte-actions/PreventDefault.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";

   export let efx = ripple();
   export let disabled = false;
</script>

<button on:click on:mousedown={preventDefault} use:efx {disabled}>
   <slot />
</button>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   button {
      @include button;
      position: relative;
      overflow: hidden;
      clip-path: var(--tjs-icon-button-clip-path, none);
      transform-style: preserve-3d;
      width: 100%;
      height: 100%;

      :hover {
         &:not(:disabled) {
            clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
         }
      }
   }
</style>
