<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentName from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentIconPicker from '~/document/svelte-components/input/DocumentIconPicker.svelte';
   import ItemSheetRaritySelect from '~/document/types/item/sheet/ItemSheetRaritySelect.svelte';
   import ItemSheetXPCostInput from '~/document/types/item/sheet/ItemSheetXPCostInput.svelte';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';

   /** @type {object} Reference to the reactive Document store. */
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
            <LabeledElement
               label={'action'}
               tooltip={'abilityAction.desc'}
            >
               <DocumentCheckboxInput value={$document.system.action}/>
            </LabeledElement>
         </div>
      </div>

      <!--Reaction-->
      <div class="row checkbox">
         <div class="input">
            <LabeledElement
               label={'reaction'}
               tooltip={'abilityReaction.desc'}
            >
               <DocumentCheckboxInput value={$document.system.reaction}/>
            </LabeledElement>
         </div>
      </div>

      <!--Passive-->
      <div class="row checkbox">
         <div class="input">
            <LabeledElement
               label={'passive'}
               tooltip={'abilityPassive.desc'}
            >
               <DocumentCheckboxInput value={$document.system.passive}/>
            </LabeledElement>
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
