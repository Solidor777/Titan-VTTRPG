<script>
   import { getContext } from 'svelte';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CharacterSheetResource
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte';
   import { RESOLVE_ICON, STAMINA_ICON, WOUNDS_ICON } from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
</script>

<!--Resources-->
<div class="resources">
   <!--Stamina-->
   {#if $document.system.resource.stamina.maxBase > 0}
      <div class="resource stamina">
         <CharacterSheetResource
            key={'stamina'}
            icon={STAMINA_ICON}
            resourceTooltip={`${localize('stamina.max')} * ${getSetting(
               'staminaBaseMultiplier',
            )}`}
         />
      </div>
   {/if}

   <!--Wounds-->
   {#if $document.system.resource.wounds.maxBase > 0}
      <div class="resource wounds">
         <CharacterSheetResource
            key={'wounds'}
            icon={WOUNDS_ICON}
            resourceTooltip={`${localize('wounds.max')} * ${getSetting(
               'woundsBaseMultiplier',
            )}`}
         />
      </div>
   {/if}

   <!--Resolve-->
   {#if $document.system.resource.resolve.maxBase > 0}
      <div class="resource resolve">
         <CharacterSheetResource
            key={'resolve'}
            icon={RESOLVE_ICON}
            resourceTooltip={`${localize('resolve.max')} * ${getSetting(
               'resolveBaseMultiplier',
            )}`}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .resources {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .resource {
         @include flex-row;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: var(--padding-standard);
            margin-top: var(--padding-standard);
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
