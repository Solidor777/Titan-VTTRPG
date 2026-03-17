<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type string Label to display. */
   export let label = localize('filter');

   /** @type string Optional Icon to display. */
   export let icon = void 0;

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
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
      @include font-size-normal;
      @include padding-standard;

      width: 100%;
   }
</style>
