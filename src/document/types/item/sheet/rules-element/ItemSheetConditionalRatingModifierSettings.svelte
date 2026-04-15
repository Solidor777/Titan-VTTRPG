<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentArmorTraitSelect from '~/document/svelte-components/select/DocumentArmorTraitSelect.svelte';
   import DocumentShieldTraitSelect from '~/document/svelte-components/select/DocumentShieldTraitSelect.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /**
    * @type {number}
    * The index of the rules element in the item's rules elements array.
    */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   let element;
   $: element = $document?.system.rulesElement[idx];

   /**
    * @type {string[]}
    * Options for selecting which rating the conditional modifier applies to.
    */
   const ratingOptions = ['melee', 'accuracy', 'defense'];

   /**
    * @type {string[]}
    * Options for selecting the defense-related condition for the modifier.
    */
   const defenseSelectorOptions = [
      'armorTrait',
      'shieldTrait',
      'customArmorTrait',
      'customShieldTrait',
   ];

   /**
    * @type {string[]}
    * Options for selecting the attack-related condition for the modifier.
    */
   const attackSelectorOptions = [
      'attackTrait',
      'attackType',
      'customWeaponTrait',
      'multiAttack',
   ];

   /**
    * Updates the element's key to a sensible default when the selector
    * changes.
    */
   function onSelectorChange() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
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

   /**
    * Updates the element's selector to a sensible default when the rating
    * changes.
    * @returns {void}
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
    * Returns the appropriate Svelte input component for the current selector
    * type.
    * @returns {object} The Svelte component to use for the key field.
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
            <ItemSheetRulesElementOperationSelect {idx}/>
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
               $document.system.deleteRulesElement(idx);
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
         margin-bottom: var(--titan-spacing-large);

         .field {
            @include flex-row;

            margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0;

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
         margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 0;
      }
   }
</style>
