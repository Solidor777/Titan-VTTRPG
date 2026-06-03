<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="label">
   <div class="content {document.data.system.parameters.attribute}">
      <!--Type Label -->
      {`${localize(document.data.system.parameters.attribute)}${
         document.data.system.parameters.skill
            ? ` (${localize(document.data.system.parameters.skill)})`
            : ''
      }`}
   </div>
</div>

<style lang="scss">
   .label {
      @include flex-row;
      @include flex-group-left;

      width: 100%;

      .content {
         @include tag;
         @include flex-row;
         @include flex-group-center;
         @include attribute-colors;
         @include font-size-large;
         @include padding-large;

         font-weight: bold;
      }
   }
</style>
