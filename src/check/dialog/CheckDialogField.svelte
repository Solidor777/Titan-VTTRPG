<script>
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   /** The label for the field. */
   export let label = void 0;

   /** The value to bind to the input. */
   export let value = void 0;

   /** The input component to bind to the value. */
   export let input = void 0;

   /** The tooltip to display when the label is hovered. */
   export let fieldTooltip = void 0;

   /** Properties for the input component. */
   export let inputProps = void 0;
</script>

<!--Field-->
<div class="field" on:change use:tooltip={fieldTooltip}>

   <!--Label-->
   <div class="label">
      {label}
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
         margin-right: var(--titan-padding-large);
      }

      .input {
         @include flex-group-left;

         width: 100%;
         margin-left: var(--titan-padding-large);

         --titan-input-height: 28px;
         --titan-input-padding: 0 8px;
      }
   }
</style>
