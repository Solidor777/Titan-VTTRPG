<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /**
    * @typedef {object} CheckDialogFieldProps
    * @property {string | TextData} [label] The text label to display for this element.
    * @property {*} [value] The value that this input should modify.
    * @property {typeof import('svelte').SvelteComponent} [input] The input Svelte component to bind the value to.
    * @property {string | TextData} [tooltip] The tooltip to display when the element is hovered.
    * @property {*} [inputProps] Properties for the input Svelte component.
    * @property {string} [testId] The stable `data-testid` applied to the field wrapper.
    */

   /** @type {CheckDialogFieldProps} */
   let {
      label = undefined,
      value = $bindable(undefined),
      input = undefined,
      tooltip = undefined,
      inputProps = undefined,
      testId = undefined,
   } = $props();
</script>

<!--Field-->
<div class="field" data-testid={testId} use:tooltipAction={tooltip}>

   <!--Label-->
   <div class="label">
      <Text text={label}/>
   </div>

   <!--Input-->
   <div class="input">
      {#if input}
         {@const Comp = input}
         <Comp {...(inputProps ?? {})} bind:value/>
      {/if}
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

         @include margin-right-large;
      }

      .input {
         @include flex-group-left;

         width: 100%;

         @include margin-left-large;

         --titan-input-height: 28px;
         --titan-input-padding: 0 8px;
      }
   }
</style>
