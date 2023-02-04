<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import DocumentName from '~/documents/components/input/DocumentNameInput.svelte';
   import CharacterSheetAttributes from '~/actor/types/character/sheet/header/CharacterSheetAttributes.svelte';
   import CharacterSheetResistances from '~/actor/types/character/sheet/header/CharacterSheetResistances.svelte';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import DocumentTextInput from '../../../documents/components/input/DocumentTextInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
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
         <DocumentName />
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
            <DocumentTextInput bind:value={$document.system.type} />
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
            <DocumentSelect {options} bind:value={$document.system.role} />
         </div>
      </div>

      <!--Exp-->
      <div class="tag">
         <StatTag value={$document.system.xp} label={localize('xp')} />
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="row stats">
      <!--Attributes-->
      <div class="section">
         <CharacterSheetAttributes />
      </div>

      <!--Resistances-->
      <div class="section">
         <CharacterSheetResistances />
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .header {
      @include panel-1;
      @include border;
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      padding: 0.25rem;

      .row {
         @include flex-row;
         @include flex-space-evenly;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
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
            margin-right: 0.25rem;
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-left;

         &:not(:first-child) {
            @include border-left;
            margin-left: 0.25rem;
            padding-left: 0.25rem;
         }

         .label {
            font-weight: bold;
         }

         .input {
            margin-left: 0.25rem;
         }

         &.text {
            flex-grow: 1;

            .input {
               width: 100%;
            }
         }
      }

      .tag {
         margin-left: 0.25rem;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include border-top;
         width: 100%;
         margin-top: 0.25rem;
         padding-top: 0.25rem;

         .section {
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               @include border-left;
               margin-left: 0.25rem;
               padding-left: 0.25rem;
            }
         }
      }
   }
</style>
