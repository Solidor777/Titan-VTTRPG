<script>
   import { getContext } from 'svelte';
   import { localize, getSetting } from '~/helpers/Utility.js';
   import CharacterSheetResource from '~/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
</script>

<!--Resources-->
<div class="resources">
   <!--Stamina-->

   {#if $document.system.resource.stamina.maxBase > 0}
      <div class="resource stamina">
         <CharacterSheetResource
            key={'stamina'}
            icon={'fas fa-heart'}
            resourceTooltip={`${localize('stamina.max')} * ${getSetting(
               'staminaBaseMultiplier'
            )}`}
         />
      </div>
   {/if}
   <!--Wounds-->
   {#if $document.system.resource.wounds.maxBase > 0}
      <div class="resource wounds">
         <CharacterSheetResource
            key={'wounds'}
            icon={'fas fa-face-head-bandage'}
            resourceTooltip={`${localize('wounds.max')} * ${getSetting(
               'woundsBaseMultiplier'
            )}`}
         />
      </div>
   {/if}

   <!--Resolve-->
   {#if $document.system.resource.resolve.maxBase > 0}
      <div class="resource resolve">
         <CharacterSheetResource
            key={'resolve'}
            icon={'fas fa-bolt'}
            resourceTooltip={`${localize('resolve.max')} * ${getSetting(
               'resolveBaseMultiplier'
            )}`}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .resources {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .resource {
         @include flex-row;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
         }

         &.stamina {
            --meter-color: var(--stamina-color);
         }

         &.wounds {
            --meter-color: var(--wounds-color);
         }

         &.resolve {
            --meter-color: var(--resolve-color);
         }
      }
   }
</style>
