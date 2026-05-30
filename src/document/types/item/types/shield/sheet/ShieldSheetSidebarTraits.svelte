<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import { getShieldTraitDescription } from '~/document/types/item/types/shield/ShieldTraits.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * List of traits converted into tags.
    * @type {object[]}
    */
   const itemTypeTraits = $derived.by(() => {
      const result = [];
      for (const [idx] in document.data.system.trait) {
         result.push({
            id: document.data.system.trait[idx].name,
            component: LabelTag,
            props: {
               tooltip: localize(getShieldTraitDescription(document.data.system.trait[idx].name)),
               label: localize(document.data.system.trait[idx].name),
            }
         });
      }
      return result;
   });
</script>

<ItemSheetSidebarTraits
   editTraits={() => document.data.system.editShieldTraits()}
   {itemTypeTraits}
/>
