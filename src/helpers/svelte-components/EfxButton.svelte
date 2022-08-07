<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";

   export let button = void 0;
   export let efx = void 0;
   export let click = void 0;

   $: efx =
      typeof button === "object" && typeof button.efx === "function"
         ? button.efx
         : typeof efx === "function"
         ? efx
         : () => {};

   $: click =
      typeof button === "object" && typeof button.click === "function"
         ? button.click
         : typeof click === "function"
         ? click
         : () => {};
</script>

<button on:click on:mousedown={preventDefault} use:efx>
   <slot />
</button>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   button {
      @include button;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      clip-path: var(--tjs-icon-button-clip-path, none);
      transform-style: preserve-3d;
      width: 100%;
      height: 100%;
   }

   button:hover {
      //background: var(--button-background-color-highlight);
      background: radial-gradient(var(--button-background-color-highlight), var(--button-background-color));
      clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
   }
</style>
