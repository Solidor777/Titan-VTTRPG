<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   // Check reference
   export let check = void 0;
</script>

<div class="label">
   <div class="content {check.parameters.resistance}">
      <!--Type Label -->
      {`${localize(check.parameters.resistance)} ${
         check.parameters.difficulty
      }:${check.parameters.complexity}`}
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
         @include border;
         @include resistance-colors;
         @include font-size-large;

         padding: var(--titan-padding-large);
         font-weight: bold;
      }
   }
</style>
