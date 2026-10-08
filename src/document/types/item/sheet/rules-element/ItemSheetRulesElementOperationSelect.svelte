<script>
   import { getContext } from 'svelte';
   import RulesElementOperationSelect
   from '~/helpers/svelte-components/input/select/RulesElementOperationSelect.svelte';
   import { RULES_ELEMENT_FACTORIES } from '~/document/types/item/rules-element/RulesElementFactories.js';
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
    * Rebuilds a Rules Element as its new operation's default element (keeping its uuid) when its Operation changes.
    * @returns {Promise<void>} Returns after the item owning the Rules Element has been updated.
    */
   async function onRulesElementOperationChanged() {
      if (document.data && idx < document.data?.system.rulesElement.length) {
         /** @type {string} The element's new operation. */
         const operation = document.data.system.rulesElement[idx].operation;
         if (!Object.hasOwn(RULES_ELEMENT_FACTORIES, operation)) {
            error(`Invalid Rules Element operation ${operation}`);
            return;
         }

         document.data.system.rulesElement[idx] = RULES_ELEMENT_FACTORIES[operation](
            document.data.system.rulesElement[idx],
         );
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
