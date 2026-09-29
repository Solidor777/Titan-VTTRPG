<script>
   import { getContext } from 'svelte';
   import {
      CHECK_TYPE_MODIFIER_TYPES,
      CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS,
      CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS,
      CONDITIONAL_CHECK_MODIFIER_TYPES,
   } from '~/system/ConditionalCheckModifierTypes.js';
   import { ADVANTAGE_ELEMENT_LEVEL_OPTIONS, clampAdvantage } from '~/check/ApplyAdvantage.js';
   import { SKILLS } from '~/system/Skills.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentAttackTraitSelect from '~/document/svelte-components/select/DocumentAttackTraitSelect.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';

   /**
    * @typedef {object} ItemSheetConditionalCheckModifierSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetConditionalCheckModifierSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @type {string[]} The modifier types this element's check type reads, in CONDITIONAL_CHECK_MODIFIER_TYPES order;
    * every type for `any`.
    */
   const modifierTypeOptions = $derived(CONDITIONAL_CHECK_MODIFIER_TYPES.filter(
      (modifierType) => isCheckTypeAllowed(document.data.system.rulesElement[idx].checkType, modifierType),
   ));

   /** @type {Array<{label: string, value: string}|string>} A situation's Skill narrowing; '' offers every Skill. */
   const situationSkillOptions = [
      {
         label: 'any',
         value: '',
      },
      ...SKILLS,
   ];

   /** @type {{label: string, value: string}[]} The check types that read this element's modifier type. */
   const checkTypeOptions = $derived(CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS.filter(
      (option) => isCheckTypeAllowed(option.value, document.data.system.rulesElement[idx].modifierType),
   ));

   /**
    * Whether a check type reads a modifier type. `any` targets every check, so it allows every type, and so does a
    * stored check type the editor does not know (rules elements are schemaless objects, so hand-authored data can carry
    * one). The modifier-type and check-type options both filter through this, so the editor cannot build a combination
    * no check reads.
    * @param {string} checkType - The element's check type.
    * @param {string} modifierType - The element's modifier type.
    * @returns {boolean} Whether the combination can apply to a check.
    */
   function isCheckTypeAllowed(checkType, modifierType) {
      /** @type {readonly string[] | undefined} The modifier types the check type reads; undefined when unknown. */
      const readTypes = Object.hasOwn(CHECK_TYPE_MODIFIER_TYPES, checkType)
         ? CHECK_TYPE_MODIFIER_TYPES[checkType]
         : void 0;
      return checkType === 'any' || !readTypes || readTypes.includes(modifierType);
   }

   /**
    * Gets the selectors a check type offers; a stored check type the editor does not know offers the `any` selectors.
    * @param {string} checkType - The stored check type, known to the editor or not.
    * @returns {readonly string[]} The selectors the check type offers, led by `any`.
    */
   function getSelectorOptions(checkType) {
      return Object.hasOwn(CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS, checkType)
         ? CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS[checkType]
         : CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS.any;
   }

   /**
    * Updates the value when the modifier type changes: Advantage starts at Advantage (1) and Automatic Failure stores
    * 1. The check type needs no reset, because the modifier-type options offer only types it reads.
    * @returns {void}
    */
   function onModifierTypeChanged() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      if (element.modifierType === 'advantage' || element.modifierType === 'automaticFailure') {
         element.value = 1;
      }
   }

   /**
    * Resets the selector to 'any' when the new check type does not offer it, cascading the change to the key and
    * Skill. A Resistance Check has no Skill, so a Resistance situation clears its Skill narrowing.
    * @returns {void}
    */
   function onCheckTypeChange() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      if (!getSelectorOptions(element.checkType).includes(element.selector)) {
         element.selector = 'any';
         onSelectorChange();
      }
      if (element.checkType === 'resistance') {
         element.skill = '';
      }
   }

   /**
    * Updates the element key to a default value when the selector changes, and clears the Skill narrowing: only a
    * situation takes one, and a newly chosen situation starts unnarrowed.
    * @returns {void}
    */
   function onSelectorChange() {
      /** @type {object} The edited element. */
      const element = document.data.system.rulesElement[idx];
      element.skill = '';
      switch (element.selector) {
         case 'attribute': {
            element.key = 'body';
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
         case 'customTrait':
         case 'multiAttack': {
            element.key = '';
            break;
         }
         case 'resistance': {
            element.key = 'reflexes';
            break;
         }
         case 'situation': {
            element.key = localize('situation');
            break;
         }
         case 'skill': {
            element.key = 'arcana';
            break;
         }
         case 'spellTradition': {
            element.key = localize('any');
            break;
         }
         default: {
            break;
         }
      }
   }

   /**
    * Returns the key input component for the current selector.
    * @returns {object | undefined} The key input component, or undefined when the selector takes no key.
    */
   function getSelector() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'attackTrait': {
            return DocumentAttackTraitSelect;
         }
         case 'attackType': {
            return DocumentAttackTypeSelect;
         }
         case 'customTrait':
         case 'situation':
         case 'spellTradition': {
            return DocumentTextInput;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'skill': {
            return DocumentSkillSelect;
         }
         default: {
            break;
         }
      }
   }
</script>

<!--Operation Settings-->
<div class="settings">

   <!--Modifier Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].modifierType}
         onchange={onModifierTypeChanged}
         options={modifierTypeOptions}
         testId={'ccm-modifier-type'}
      />
   </div>

   <!--Check Type-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].checkType}
         onchange={onCheckTypeChange}
         options={checkTypeOptions}
         testId={'ccm-check-type'}
      />
   </div>

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={getSelectorOptions(document.data.system.rulesElement[idx].checkType)}
         testId={'ccm-selector'}
      />
   </div>

   <!--Key-->
   {#if document.data.system.rulesElement[idx].selector !== 'any'}
      <div class="field select">
         {#if getSelector()}
            {@const Selector = getSelector()}
            <Selector bind:value={document.data.system.rulesElement[idx].key}/>
         {/if}
      </div>
   {/if}

   <!--Skill narrowing: a situation may offer itself only on checks using one Skill; Resistance Checks have none.-->
   {#if document.data.system.rulesElement[idx].selector === 'situation' &&
      document.data.system.rulesElement[idx].checkType !== 'resistance'}
      <div class="field select">
         <DocumentSelect
            bind:value={
               () => document.data.system.rulesElement[idx].skill ?? '',
               (skill) => {
                  document.data.system.rulesElement[idx].skill = skill;
               }
            }
            options={situationSkillOptions}
            testId={'ccm-situation-skill'}
         />
      </div>
   {/if}

   <!--Value: Advantage stores a level, Automatic Failure stores none, every other type stores an integer.-->
   {#if document.data.system.rulesElement[idx].modifierType === 'advantage'}
      <!--The level shows normalized (0 or a non-number as Advantage, ±3 as Greater), so the select never rewrites a
         stored value it cannot show; the stored value changes only when the user picks a level.-->
      <div class="field select">
         <DocumentSelect
            bind:value={
               () => clampAdvantage(Number(document.data.system.rulesElement[idx].value)) || 1,
               (level) => {
                  document.data.system.rulesElement[idx].value = level;
               }
            }
            options={ADVANTAGE_ELEMENT_LEVEL_OPTIONS}
            testId={'ccm-advantage-level'}
         />
      </div>
   {:else if document.data.system.rulesElement[idx].modifierType !== 'automaticFailure'}
      <div class="field number">
         <DocumentIntegerInput
            bind:value={document.data.system.rulesElement[idx].value}
            testId={'ccm-value'}
         />
      </div>
   {/if}
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
