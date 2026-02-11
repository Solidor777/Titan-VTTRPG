<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentName from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentIconPicker from '~/document/svelte-components/input/DocumentIconPicker.svelte';
   import ItemSheetRaritySelect from '~/document/types/item/sheet/ItemSheetRaritySelect.svelte';
   import ItemSheetXPCostInput from '~/document/types/item/sheet/ItemSheetXPCostInput.svelte';
   import LabeledInput from '~/helpers/svelte-components/LabeledInput.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="column icon">
      <DocumentIconPicker alt={'item icon'}/>
   </div>

   <!--Middle Label-->
   <div class="column middle">

      <!--Name-->
      <div class="input name">
         <DocumentName tooltip={localize('abilityName.desc')}/>
      </div>

      <!--Stats-->
      <div class="row">

         <!--Rarity-->
         <div class="input">
            <ItemSheetRaritySelect/>
         </div>

         <!--XP Cost-->
         <div class="input number">
            <ItemSheetXPCostInput tooltip={localize('abilityXpCost.desc')}/>
         </div>
      </div>
   </div>

   <!--Usage Type-->
   <div class="column right">

      <!--Action-->
      <div class="row checkbox">
         <div class="input">
            <LabeledInput tooltip={localize('abilityAction.desc')}>
               <svelte:fragment slot="label">{localize('action')}</svelte:fragment>
               <svelte:fragment slot="input">
                  <DocumentCheckboxInput value={$document.system.action}/>
               </svelte:fragment>
            </LabeledInput>
         </div>
      </div>

      <!--Reaction-->
      <div class="row checkbox">
         <div class="input">
            <LabeledInput tooltip={localize('abilityReaction.desc')}>
               <svelte:fragment slot="label">{localize('reaction')}</svelte:fragment>
               <svelte:fragment slot="input">
                  <DocumentCheckboxInput value={$document.system.reaction}/>
               </svelte:fragment>
            </LabeledInput>
         </div>
      </div>

      <!--Passive-->
      <div class="row checkbox">
         <div class="input">
            <LabeledInput tooltip={localize('abilityPassive.desc')}>
               <svelte:fragment slot="label">{localize('passive')}</svelte:fragment>
               <svelte:fragment slot="input">
                  <DocumentCheckboxInput value={$document.system.reaction}/>
               </svelte:fragment>
            </LabeledInput>
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include flex-row;
      @include flex-space-between;
      @include panel-1;
      @include separated-row-large;
      @include padding-large;

      width: 100%;

      .column {
         @include flex-column;
         @include separated-column-large;

         &.middle {
            @include flex-group-left;

            flex-grow: 2;
         }

         &.right {
            @include flex-group-right;
         }

         .row {
            @include flex-row;
            @include border-separated-row-large;

            width: 100%;

            &.checkbox {
               @include flex-group-right;

               &:not(:first-child) {
                  padding-top: var(--titan-spacing-standard);
               }
            }
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            &.name {
               width: 100%;
               flex-basis: max-content;

               --titan-input-width: 100%;
            }

            &.number {
               --titan-input-width: 32px;
            }
         }

         &.icon {
            width: 80px;
         }
      }
   }
</style>
