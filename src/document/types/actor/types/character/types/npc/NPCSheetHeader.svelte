<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentNameInput from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import CharacterSheetAttributes
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttributes.svelte';
   import CharacterSheetResistances
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistances.svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import createLocalizedOptions from '~/helpers/utility-functions/CreateLocalizedOptions.js';
   import { ROLES } from '~/system/Roles.js';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {SelectOption<string>[]} - Options for the role of NPC (Minion, Warrior, Elite, or Champion).*/
   const roleOptions = createLocalizedOptions(ROLES);
</script>

<div class="header">
   <!--Name-->
   <div class="row">
      <DocumentNameInput tooltip={localize('characterName.desc')}/>
   </div>

   <!--Character Info-->
   <div class="row">

      <!--Character Type-->
      <div class="stat text">
         <LabeledElement
            label={'type'}
            tooltip={'type.desc'}
         >
            <DocumentTextInput bind:value={$document.system.bio.type}/>
         </LabeledElement>
      </div>

      <!--Character Role-->
      <div class="stat">
         <LabeledElement
            label={'role'}
            tooltip={'role.desc'}
         >
            <DocumentSelect bind:value={$document.system.role} options={roleOptions}/>
         </LabeledElement>
      </div>

      <!--Exp-->
      <div class="stat">
         <StatTag
            label={'xp'}
            tooltip={'xpTotalCost.desc'}
            value={$document.system.xp}/>
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
            @include flex-row;
            @include flex-group-left;

            &:not(:first-child) {
               @include border-left;

               margin-left: var(--titan-spacing-standard);
               padding-left: var(--titan-spacing-standard);
            }
         }
      }
   }
</style>
