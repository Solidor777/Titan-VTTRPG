<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string} - The label for the element. */
   export let label = void 0;

   /** @type {*} The value that this input should modify. */
   export let value = void 0;

   /** @type {SvelteComponent} -The input svelte component to bind the value to. */
   export let input = void 0;

   /** @type {string|TooltipData} - The tooltip to display when the element is hovered. */
   export let fieldTooltip = void 0;

   /** @type {*} - Properties for the input svelte components. */
   export let inputProps = void 0;
</script>

<!--Field-->
<div class="field" on:change use:tooltipAction={fieldTooltip}>

   <!--Label-->
   <div class="sign">
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

      .sign {
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
