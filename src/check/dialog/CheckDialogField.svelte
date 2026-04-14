<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /** @type {string|TextData} The text label to display for this element. */
   export let label = void 0;

   /** @type {*} The value that this input should modify. */
   export let value = void 0;

   /**
    * @type {SvelteComponent} The input svelte component to bind the value to.
    */
   export let input = void 0;

   /**
    * @type {string|TextData}
    * The tooltip to display when the element is hovered.
    */
   export let tooltip = void 0;

   /** @type {*} Properties for the input svelte components. */
   export let inputProps = void 0;
</script>

<!--Field-->
<div class="field" on:change use:tooltipAction={tooltip}>

   <!--Label-->
   <div class="label">
      <Text text={label}/>
   </div>

   <!--Input-->
   <div class="input" on:change>
      <svelte:component {...inputProps} bind:value this={input}/>
   </div>
</div>

<style lang="scss">
   .field {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      height: 100%;

      .label {
         @include flex-group-right;

         width: 100%;
         font-weight: bold;
         margin-right: var(--titan-spacing-large);
      }

      .input {
         @include flex-group-left;

         width: 100%;
         margin-left: var(--titan-spacing-large);

         --titan-input-height: 28px;
         --titan-input-padding: 0 8px;
      }
   }
</style>
