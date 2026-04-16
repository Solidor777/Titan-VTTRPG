<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentArmorTraitSelect from '~/document/svelte-components/select/DocumentArmorTraitSelect.svelte';
   import DocumentShieldTraitSelect from '~/document/svelte-components/select/DocumentShieldTraitSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for selecting which rating the conditional modifier applies to. */
   const ratingOptions = [
      'melee',
      'accuracy',
      'defense',
   ];

   /** @type {string[]} Options for selecting the defense-related condition for the modifier. */
   const defenseSelectorOptions = [
      'armorTrait',
      'shieldTrait',
      'customArmorTrait',
      'customShieldTrait',
   ];

   /** @type {string[]} Options for selecting the attack-related condition for the modifier. */
   const attackSelectorOptions = [
      'attackTrait',
      'attackType',
      'customWeaponTrait',
      'multiAttack',
   ];

   /**
    * Updates the element's key to a sensible default when the selector changes.
    */
   function onSelectorChange() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         switch ($document.system.rulesElement[idx].selector) {
            case 'armorTrait':
            case 'shieldTrait': {
               $document.system.rulesElement[idx].key = 'magical';
               break;
            }
            case 'customArmorTrait':
            case 'customWeaponTrait':
            case 'customShieldTrait':
            case 'multiAttack': {
               $document.system.rulesElement[idx].key = '';
               break;
            }
            case 'attackTrait': {
               $document.system.rulesElement[idx].key = 'blast';
               break;
            }
            case 'attackType': {
               $document.system.rulesElement[idx].key = 'melee';
               break;
            }
            default: {
               break;
            }
         }

         $document.update({
            system: structuredClone($document.system),
         });
      }
   }

   /**
    * Updates the element's selector to a sensible default when the rating changes.
    * @returns {void}
    */
   function onRatingChange() {
      switch ($document.system.rulesElement[idx].rating) {
         case 'defense': {
            $document.system.rulesElement[idx].selector = 'armorTrait';
            break;
         }
         default: {
            $document.system.rulesElement[idx].selector = 'attackTrait';
            break;
         }
      }

      onSelectorChange();
   }

   /**
    * Returns the appropriate Svelte input component for the current selector type.
    * @returns {object} The Svelte component to use for the key field.
    */
   function getSelector() {
      switch ($document.system.rulesElement[idx].selector) {
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

<!--Settings-->
<div class="settings">

   <!--Rating-->
   <div class="field select">
      <DocumentSelect
         bind:value={$document.system.rulesElement[idx].rating}
         on:change={onRatingChange}
         options={ratingOptions}
      />
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={$document.system.rulesElement[idx].selector}
         on:change={onSelectorChange}
         options={$document.system.rulesElement[idx].rating === 'defense'
                  ? defenseSelectorOptions
                  : attackSelectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      <svelte:component bind:value={$document.system.rulesElement[idx].key} this={getSelector()}/>
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={$document.system.rulesElement[idx].value}/>
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;
         @include flex-group-left;
      }
   }
</style>

