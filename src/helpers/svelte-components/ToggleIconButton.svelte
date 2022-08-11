<script>
   export let trueIcon = void 0;
   export let falseIcon = void 0;
   export let efx = void 0;
   export let value = void 0;

   $: icon = value === true ? trueIcon : falseIcon;
</script>

<div
   on:click={() => {
      value = !value;
   }}
   class="button"
   use:efx
>
   <i class={icon} />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   .button {
      @include icon-button;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      clip-path: var(--tjs-icon-button-clip-path, none);
      transform-style: preserve-3d;
      width: var(--icon-button-radius);
      height: var(--icon-button-radius);
   }

   .button:hover {
      background: radial-gradient(var(--button-background-color-highlight), var(--button-background-color));
      clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
   }
</style>
