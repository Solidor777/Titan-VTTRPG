<script>
   import { getContext } from 'svelte';
   import RulesElementOperationSelect from '~/helpers/svelte-components/input/select/RulesElementOperationSelect.svelte';
   import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
   import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
   import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
   import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage.js';
   import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage.js';
   import createRollMessageElement from '~/document/types/item/rules-element/RollMessage.js';
   import createConditionalRatingModifierElement from '~/document/types/item/rules-element/ConditionalRatingModifier.js';
   import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';
   import error from '~/helpers/utility-functions/Error.js';

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {number} The index of the Rules Element in the rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Updates a Rules Element when its Operation type changes.
    * @returns {Promise<void>} Returns after the item owning the Rules Element
    *    has been updated.
    */
   async function onRulesElementOperationChanged() {
      if ($document && idx < $document?.system.rulesElement.length) {
         switch ($document.system.rulesElement[idx].operation) {
            case 'flatModifier': {
               $document.system.rulesElement[idx] =
                  createFlatModifierElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'mulBase': {
               $document.system.rulesElement[idx] =
                  createMulBaseElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'fastHealing': {
               $document.system.rulesElement[idx] =
                  createFastHealingElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'persistentDamage': {
               $document.system.rulesElement[idx] =
                  createPersistentDamageElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'turnMessage': {
               $document.system.rulesElement[idx] =
                  createTurnMessageElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'rollMessage': {
               $document.system.rulesElement[idx] =
                  createRollMessageElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'conditionalRatingModifier': {
               $document.system.rulesElement[idx] =
                  createConditionalRatingModifierElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            case 'conditionalCheckModifier': {
               $document.system.rulesElement[idx] =
                  createConditionalCheckModifierElement(
                     $document.system.rulesElement[idx],
                  );
               break;
            }
            default: {
               const op =
                  $document.system.rulesElement[idx].operation;
               error(`Invalid Rules Element operation ${op}`);
               return;
            }
         }

         await $document.update({
            system: {
               rulesElement: $document.system.rulesElement,
            },
         });
      }
   }

</script>

<RulesElementOperationSelect
   bind:value={$document.system.rulesElement[idx].operation}
   disabled={disabled || !$document?.isOwner}
   on:change={() => onRulesElementOperationChanged()}
   {tooltip}
/>
