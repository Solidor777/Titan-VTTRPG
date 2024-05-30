<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   // Filter Items
   export let filter = void 0;
</script>

<!--Filter-->
<div class="filter">
   <div class="label">{localize('filter')}</div>
   <div class="input">
      <TextInput bind:value={filter}/>
   </div>
</div>

<style lang="scss">
   .filter {
      @include flex-row;
      @include flex-group-center;
      @include border-bottom;
      @include panel-1;
      @include font-size-normal;

      width: 100%;
      padding: var(--titan-padding-standard);

      .label {
         font-weight: bold;
         margin-right: var(--titan-padding-standard);
      }
   }
</style>
