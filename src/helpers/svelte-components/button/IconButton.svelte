<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";

   export let icon = void 0;
   export let efx = ripple();
</script>

<button on:click on:mousedown={preventDefault} use:efx>
   <div><i class={icon} /></div>
</button>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   button {
      @include icon-button;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      clip-path: var(--tjs-icon-button-clip-path, none);
      transform-style: preserve-3d;
      width: var(--icon-button-radius);
      height: var(--icon-button-radius);
   }

   button:hover {
      background: radial-gradient(var(--button-background-color-highlight), var(--button-background-color));
      clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
   }
</style>
