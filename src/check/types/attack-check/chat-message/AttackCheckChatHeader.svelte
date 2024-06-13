<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="label">
   <div class="content {$document.flags.titan.parameters.attribute}">
      <img
         alt="item"
         class={$document.flags.titan.parameters.img.indexOf('.svg') === -1
            ? ''
            : 'svg'}
         src={$document.flags.titan.parameters.img}
      />

      <!--Labels-->
      <div class="labels">
         <!--Label-->
         <div class="label">
            {`${$document.flags.titan.parameters.itemName}`}
         </div>

         <!--Attack -->
         <div class="sub-label">
            {$document.flags.titan.parameters.attackName}
         </div>

         <!--Type Label -->
         <div class="sub-label">
            {`${localize(
               $document.flags.titan.parameters.attribute,
            )} (${localize($document.flags.titan.parameters.skill)})`}
         </div>

         <!--Target defense-->
         {#if $document.flags.titan.parameters.targetDefense !== undefined}
            {`${
               $document.flags.titan.parameters.type === 'melee'
                  ? `${localize('melee')}`
                  : `${localize('accuracy')}`
            } ${$document.flags.titan.parameters.attackerRating} ${localize(
               'versus',
            )} ${localize('defense')} ${
               $document.flags.titan.parameters.targetDefense
            }`}
         {/if}

         <!--Damage -->
         <div class="sub-label">
            {`${localize('damage')}:
            ${
               $document.flags.titan.results.damage +
               $document.flags.titan.parameters.damageMod
            }
            ${
               $document.flags.titan.parameters.plusExtraSuccessDamage
                  ? ` + ${localize('extraSuccesses.short')}`
                  : ''
            }`}
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   .label {
      @include flex-row;
      @include flex-group-left;

      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-left;
         @include attribute-colors;
         @include border;
         @include tag;

         padding: var(--titan-padding-large);
         font-weight: bold;

         img {
            width: 32px;
            border: none;
            margin-right: var(--titan-padding-standard);
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
