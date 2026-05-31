<script>
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /**
    * @typedef {object} TopFilterProps
    * @property {string} [label='filter'] - Label to display.
    * @property {string} [icon=undefined] - Optional Icon to display.
    * @property {string} [value=undefined] - The value that this input should modify.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    */

   /** @type {TopFilterProps} */
   let {
      label   = 'filter',
      icon    = undefined,
      value   = $bindable(undefined),
      tooltip = undefined,
   } = $props();
</script>

<!--Filter-->
<div class="filter">
   <LabeledElement
      {icon}
      {label}
      {tooltip}>
      <TextInput bind:value/>
   </LabeledElement>
</div>

<style lang="scss">
   .filter {
      @include flex-row;
      @include flex-group-center;
      @include border-bottom;
      @include panel-1;
      @include padding-standard;

      width: 100%;
   }
</style>
