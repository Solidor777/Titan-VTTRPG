<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentNameInput from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import CharacterSheetAttributes
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttributes.svelte';
   import CharacterSheetResistances
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistances.svelte';
   import CharacterSheetInspiration
      from '~/document/types/actor/types/character/types/player/PlayerSheetInspiration.svelte';
   import StatModLabel from '~/helpers/svelte-components/label/StatModLabel.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="header">
   <!--Name and XP-->
   <div class="main-header">
      <!--Character name Sheet-->
      <div class="actor-name">
         <DocumentNameInput/>
      </div>

      <!--Inspiration Toggle-->
      <div class="inspiration">
         <CharacterSheetInspiration/>
      </div>

      <!--Exp-->
      <div class="xp">
         <!--Available-->
         <div
            class="available"
            use:tooltipAction="{localize('xpAvailable')}"
         >
            <StatModLabel
               baseValue={0}
               currentValue={$document.system.xp.available}
            />
         </div>
         <div class="symbol">/</div>

         <!--Earned Input-->
         <div class="earned" use:tooltipAction="{localize('xpEarned')}">
            <DocumentIntegerInput bind:value={$document.system.xp.earned}/>
         </div>

         <!--Label-->
         <div class="label">{localize('xp')}</div>
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="stats">
      <!--Attributes-->
      <div class="section">
         <CharacterSheetAttributes/>
      </div>

      <!--Resistances-->
      <div class="section">
         <CharacterSheetResistances/>
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include panel-1;

      padding: var(--titan-padding-standard);

      .main-header {
         @include flex-row;
         @include flex-space-between;

         width: 100%;

         .actor-name {
            @include flex-row;
            @include flex-group-left;

            flex: auto;
            margin-right: var(--titan-padding-standard);
         }

         .inspiration {
            @include flex-row;
            @include flex-group-center;

            margin-right: var(--titan-padding-standard);
         }

         .xp {
            @include flex-row;
            @include flex-group-center;

            margin-right: var(--titan-padding-standard);

            .available {
               @include flex-row;
               @include flex-group-center;

               width: 40px;
               height: var(--titan-input-height);
            }

            .symbol {
               @include flex-row;

               margin: var(--titan-padding-standard);
            }

            .earned {
               @include flex-row;
               @include flex-group-center;

               margin-right: var(--titan-padding-large);
               width: 40px;
            }

            .label {
               @include flex-row;
               @include flex-group-center;

               font-weight: bold;
            }
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include border-top;

         width: 100%;
         margin-top: var(--titan-padding-standard);
         padding-top: var(--titan-padding-standard);

         .section {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            &:not(:first-child) {
               @include border-left;

               margin-left: var(--titan-padding-standard);
               padding-left: var(--titan-padding-standard);
            }
         }
      }
   }
</style>
