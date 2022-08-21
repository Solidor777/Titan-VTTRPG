<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";

   export let efx = void 0;
   export let value = void 0;
</script>

<button
   on:click={() => {
      value = !value;
   }}
   on:mousedown={preventDefault}
   use:efx
>
   {#if value === true}
      <slot name="true" />
   {:else}
      <slot name="false" />
   {/if}
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
      background: radial-gradient(var(--button-background-color-highlight), var(--button-background-color));
      clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
   }
</style>
