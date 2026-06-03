<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} ResistanceCheckChatHeaderProps
    * @property {object} [check] - The typed check system data for this document.
    */

   /** @type {ResistanceCheckChatHeaderProps} */
   const { check = undefined } = $props();
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
         @include padding-large;

         font-weight: bold;
      }
   }
</style>
