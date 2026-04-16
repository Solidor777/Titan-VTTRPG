<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getArmorTraitDescription } from '~/document/types/item/types/armor/ArmorTraits.js';
   import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {Tag[]} List of traits converted into tags. */
   let itemTypeTraits;

   // Populate the tags list.
   $: {
      itemTypeTraits = [];
      for (const [idx] in $document.system.trait) {
         itemTypeTraits.push({
            id: $document.system.trait[idx].name,
            component: LabelTag,
            props: {
               tooltip: localize(getArmorTraitDescription($document.system.trait[idx].name)),
               label: localize($document.system.trait[idx].name),
            }
         });
      }
   }
</script>

<ItemSheetSidebarTraits
   editTraits={() => $document.system.editArmorTraits()}
   {itemTypeTraits}
/>
