<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/sheet/rules-element/OnRulesElementOperationChanged.js';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentArmorTraitSelect from '~/document/svelte-components/select/DocumentArmorTraitSelect.svelte';
   import DocumentShieldTraitSelect from '~/document/svelte-components/select/DocumentShieldTraitSelect.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   export let operationOptions = void 0;
   export let idx = void 0;
   export let element = void 0;

   // Rating optiions
   const ratingOptions = [
      {
         label: localize('melee'),
         value: 'melee',
      },
      {
         label: localize('accuracy'),
         value: 'accuracy',
      },
      {
         label: localize('defense'),
         value: 'defense',
      },
   ];

   const defenseSelectorOptions = [
      {
         label: localize('armorTrait'),
         value: 'armorTrait',
      },
      {
         label: localize('shieldTrait'),
         value: 'shieldTrait',
      },
      {
         label: localize('customArmorTrait'),
         value: 'customArmorTrait',
      },
      {
         label: localize('customShieldTrait'),
         value: 'customShieldTrait',
      },
   ];

   const attackSelectorOptions = [
      {
         label: localize('attackTrait'),
         value: 'attackTrait',
      },
      {
         label: localize('attackType'),
         value: 'attackType',
      },
      {
         label: localize('customWeaponTrait'),
         value: 'customWeaponTrait',
      },
      {
         label: localize('multiAttack'),
         value: 'multiAttack',
      },
   ];

   // Updates the key when the selector changes
   /**
    *
    */
   function onSelectorChange() {
      if ($document?.isOwner) {
         switch (element.selector) {
            case 'armorTrait':
            case 'shieldTrait': {
               element.key = 'magical';
               break;
            }
            case 'customArmorTrait':
            case 'customWeaponTrait':
            case 'customShieldTrait':
            case 'multiAttack': {
               element.key = '';
               break;
            }
            case 'attackTrait': {
               element.key = 'blast';
               break;
            }
            case 'attackType': {
               element.key = 'melee';
               break;
            }
            default: {
               break;
            }
         }

         $document.update({
            system: $document.system,
         });
      }
   }

   // Updates the selector when the rating changes
   /**
    *
    */
   function onRatingChange() {
      switch (element.rating) {
         case 'defense': {
            element.selector = 'armorTrait';
            break;
         }
         default: {
            element.selector = 'attackTrait';
            break;
         }
      }

      onSelectorChange();
   }

   /**
    *
    */
   function getSelector() {
      switch (element.selector) {
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentAttackTypeSelect;
         }
         case 'armorTrait': {
            return DocumentArmorTraitSelect;
         }
         case 'shieldTrait': {
            return DocumentShieldTraitSelect;
         }
         case 'customArmorTrait':
         case 'customWeaponTrait':
         case 'customShieldTrait': {
            return DocumentTextInput;
         }
         default: {
            break;
         }
      }
   }
</script>

{#if element && element.operation === 'conditionalRatingModifier'}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <DocumentSelect
               options={operationOptions}
               bind:value={element.operation}
               on:change={() => {
                  onRulesElementOperationChanged($document, idx);
               }}
            />
         </div>

         <!--Rating-->
         <div class="field select">
            <DocumentSelect
               options={ratingOptions}
               bind:value={element.rating}
               on:change={onRatingChange}
            />
         </div>

         <!--Selector-->
         <div class="field select">
            <DocumentSelect
               options={element.rating === 'defense'
                  ? defenseSelectorOptions
                  : attackSelectorOptions}
               bind:value={element.selector}
               on:change={onSelectorChange}
            />
         </div>

         <!--Key-->
         <div class="field select">
            <svelte:component this={getSelector()} bind:value={element.key}/>
         </div>

         <!--Value-->
         <div class="field number">
            <DocumentIntegerInput bind:value={element.value}/>
         </div>
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={DELETE_ICON}
            on:click={() => {
               $document.system.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-1;

      width: 100%;
      height: 100%;

      .settings {
         @include flex-row;
         @include flex-group-left;

         flex-wrap: wrap;
         width: 100%;
         margin-bottom: var(--titan-padding-large);

         .field {
            @include flex-row;

            margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);

            &.select {
               @include flex-group-left;
            }

            &.number {
               @include flex-group-center;

               width: 32px;
            }
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;

         height: 100%;
         margin: var(--titan-padding-large) var(--titan-padding-standard) 0 0;
      }
   }
</style>
