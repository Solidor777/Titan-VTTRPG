<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="label">
   <div class="content {$document.flags.titan.parameters.attribute}">
      <img
         src={$document.flags.titan.parameters.img}
         alt="item"
         class={$document.flags.titan.parameters.img.indexOf('.svg') === -1
            ? ''
            : 'svg'}
      />

      <!--Labels-->
      <div class="labels">
         <!--Label-->
         <div class="label">
            {`${$document.flags.titan.parameters.itemName}`}
         </div>

         <!--Type Label -->
         <div class="sub-label">
            {`${localize(
               $document.flags.titan.parameters.attribute
            )} (${localize($document.flags.titan.parameters.skill)})`}
         </div>

         <!--Tradition -->
         {#if $document.flags.titan.parameters.tradition !== '' && $document.flags.titan.parameters.tradition !== localize('any')}
            <div class="sub-label">
               {$document.flags.titan.parameters.tradition}
            </div>
         {/if}
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../styles/mixins.scss';
   .label {
      @include flex-row;
      @include flex-group-left;
      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-left;
         @include attribute-colors;
         @include border;
         @include label;
         padding: 0.5rem;
         font-weight: bold;

         img {
            width: 2rem;
            border: none;
            margin-right: 0.25rem;
         }

         .labels {
            @include flex-column;
            @include flex-group-top-left;
            .label {
               @include flex-row;
               @include font-size-large;
            }

            .sub-label {
               @include flex-row;
               @include font-size-small;
            }
         }
      }
   }
</style>
