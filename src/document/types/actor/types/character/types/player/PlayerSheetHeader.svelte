<script>
   import { getContext } from 'svelte';
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
   import ModifiedValueLabel from '~/helpers/svelte-components/label/ModifiedValueLabel.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="header">
   <!--Name and XP-->
   <div class="row">
      <!--Character name Sheet-->
      <div class="stat text">
         <DocumentNameInput tooltip={localize('characterName.desc')}/>
      </div>

      <!--Inspiration Toggle-->
      <div class="stat">
         <CharacterSheetInspiration/>
      </div>

      <!--XP-->
      <div class="stat xp">
         <!--XP Available-->
         <div
            class="available"
            use:tooltipAction="{localize('xpAvailable.desc')}"
         >
            <ModifiedValueLabel
               baseValue={0}
               currentValue={$document.system.xp.available}
            />
         </div>

         <!--out of-->
         <div class="symbol">/</div>

         <!--XP Earned-->
         <div class="earned" use:tooltipAction="{localize('xpEarned.desc')}">
            <DocumentIntegerInput bind:value={$document.system.xp.earned}/>
         </div>

         <!--Label-->
         <div class="label">{localize('xp')}</div>
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="row">
      <!--Attributes-->
      <div class="column">
         <CharacterSheetAttributes/>
      </div>

      <!--Resistances-->
      <div class="column">
         <CharacterSheetResistances/>
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include padding-large;

      .row {
         @include flex-row;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-spacing-standard);
            padding-top: var(--titan-spacing-standard);
         }

         .column {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            &:not(:first-child) {
               @include border-left;

               margin-left: var(--titan-spacing-standard);
               padding-left: var(--titan-spacing-standard);
            }
         }

         .stat {
            margin-left: var(--titan-spacing-standard);

            &.text {
               flex-grow: 1;
            }

            &.xp {
               @include flex-row;
               @include flex-group-center;

               margin-right: var(--titan-spacing-standard);

               .available {
                  @include flex-row;
                  @include flex-group-center;

                  width: 40px;
                  height: var(--titan-input-height);
               }

               .symbol {
                  @include flex-row;

                  margin: var(--titan-spacing-standard);
               }

               .earned {
                  @include flex-row;
                  @include flex-group-center;

                  margin-right: var(--titan-spacing-large);
                  width: 40px;
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;

                  font-weight: bold;
               }
            }
         }

         .text {
            flex-grow: 1;
         }
      }
   }
</style>
