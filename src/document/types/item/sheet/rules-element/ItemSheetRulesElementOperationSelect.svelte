<script>
   import { getContext } from 'svelte';
   import RulesElementOperationSelect
      from '~/helpers/svelte-components/input/select/RulesElementOperationSelect.svelte';
   import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
   import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
   import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
   import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage.js';
   import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage.js';
   import createRollMessageElement from '~/document/types/item/rules-element/RollMessage.js';
   import createConditionalRatingModifierElement
      from '~/document/types/item/rules-element/ConditionalRatingModifier.js';
   import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';
   import error from '~/helpers/utility-functions/Error.js';

   /**
    * @typedef {object} ItemSheetRulesElementOperationSelectProps
    * @property {boolean} [disabled] Whether the input should currently be disabled.
    * @property {string | object} [tooltip] The Tooltip to display for this element, if any.
    * @property {number} [idx] The index of the Rules Element in the rules elements array.
    */

   /** @type {ItemSheetRulesElementOperationSelectProps} */
   const { disabled = false, tooltip = undefined, idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Updates a Rules Element when its Operation type changes.
    * @returns {Promise<void>} Returns after the item owning the Rules Element has been updated.
    */
   async function onRulesElementOperationChanged() {
      if (document.data && idx < document.data?.system.rulesElement.length) {
         switch (document.data.system.rulesElement[idx].operation) {
            case 'flatModifier': {
               document.data.system.rulesElement[idx] =
                  createFlatModifierElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'mulBase': {
               document.data.system.rulesElement[idx] =
                  createMulBaseElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'fastHealing': {
               document.data.system.rulesElement[idx] =
                  createFastHealingElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'persistentDamage': {
               document.data.system.rulesElement[idx] =
                  createPersistentDamageElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'turnMessage': {
               document.data.system.rulesElement[idx] =
                  createTurnMessageElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'rollMessage': {
               document.data.system.rulesElement[idx] =
                  createRollMessageElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'conditionalRatingModifier': {
               document.data.system.rulesElement[idx] =
                  createConditionalRatingModifierElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            case 'conditionalCheckModifier': {
               document.data.system.rulesElement[idx] =
                  createConditionalCheckModifierElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
            default: {
               const op =
                        document.data.system.rulesElement[idx].operation;
               error(`Invalid Rules Element operation ${op}`);
               return;
            }
         }

         await document.data.update({
            system: {
               rulesElement: structuredClone(document.data.system.rulesElement),
            },
         });
      }
   }
</script>

<RulesElementOperationSelect
   bind:value={document.data.system.rulesElement[idx].operation}
   disabled={disabled || !document.data?.isOwner}
   onchange={() => onRulesElementOperationChanged()}
   {tooltip}
/>
