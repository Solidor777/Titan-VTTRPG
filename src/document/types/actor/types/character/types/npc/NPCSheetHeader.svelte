<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentName from '~/document/components/input/DocumentNameInput.svelte';
   import CharacterSheetAttributes
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttributes.svelte';
   import CharacterSheetResistances
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistances.svelte';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';

   // Setup context variables
   const document = getContext('document');
   const options = [
      {
         label: localize('minion'),
         value: 'minion',
      },
      {
         label: localize('warrior'),
         value: 'warrior',
      },
      {
         label: localize('elite'),
         value: 'elite',
      },
      {
         label: localize('champion'),
         value: 'champion',
      },
   ];
</script>

<div class="header">
   <!--Name and XP-->
   <div class="row main-header">
      <!--Character name Sheet-->
      <div class="actor-name">
         <DocumentName/>
      </div>
   </div>

   <!--Type-->
   <div class="row">
      <!--Type-->
      <div class="stat text">
         <!--Label-->
         <div class="label">
            {localize('type')}
         </div>

         <!--Input-->
         <div class="input">
            <DocumentTextInput bind:value={$document.system.bio.type}/>
         </div>
      </div>

      <!--Type-->
      <div class="stat">
         <!--Label-->
         <div class="label">
            {localize('role')}
         </div>

         <!--Input-->
         <div class="input">
            <DocumentSelect {options} bind:value={$document.system.role}/>
         </div>
      </div>

      <!--Exp-->
      <div class="tag">
         <StatTag value={$document.system.xp} label={localize('xp')}/>
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="row stats">
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
      @include panel-1;
      @include border;

      padding: var(--padding-standard);

      .row {
         @include flex-row;
         @include flex-space-evenly;

         width: 100%;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--padding-standard);
            padding-top: var(--padding-standard);
         }
      }

      .main-header {
         @include flex-row;
         @include flex-space-between;

         width: 100%;

         .actor-name {
            @include flex-row;
            @include flex-group-left;

            flex: auto;
            margin-right: var(--padding-standard);
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-left;

         &:not(:first-child) {
            @include border-left;

            margin-left: var(--padding-standard);
            padding-left: var(--padding-standard);
         }

         .label {
            font-weight: bold;
         }

         .input {
            margin-left: var(--padding-standard);
         }

         &.text {
            flex-grow: 1;

            .input {
               width: 100%;
            }
         }
      }

      .tag {
         margin-left: var(--padding-standard);
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include border-top;

         width: 100%;
         margin-top: var(--padding-standard);
         padding-top: var(--padding-standard);

         .section {
            @include flex-row;
            @include flex-group-center;

            width: 100%;

            &:not(:first-child) {
               @include border-left;

               margin-left: var(--padding-standard);
               padding-left: var(--padding-standard);
            }
         }
      }
   }
</style>
