<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="label">
   <div class="content {$document.flags.titan.parameters.attribute}">
      <!--Type Label -->
      {`${localize($document.flags.titan.parameters.attribute)}${
         $document.flags.titan.parameters.skill
            ? ` (${localize($document.flags.titan.parameters.skill)})`
            : ''
      }`}
   </div>
</div>

<style lang="scss">
   @import '../../../styles/mixins.scss';
   .label {
      @include flex-row;
      @include flex-group-left;
      width: 100%;

      .content {
         @include label;
         @include flex-row;
         @include flex-group-center;
         @include border;
         @include attribute-colors;
         @include font-size-large;
         padding: 0.5rem;
         font-weight: bold;
      }
   }
</style>
