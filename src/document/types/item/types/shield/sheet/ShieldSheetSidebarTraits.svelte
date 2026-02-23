<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import { getShieldTraitDescription } from '~/document/types/item/types/shield/ShieldTraits.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type Tag[] List of traits converted into tags. */
   let tags;

   // Populate the tags list
   $: {
      tags = [];
      for (const [idx] in $document.system.trait) {
         tags.push({
            id: $document.system.trait[idx].name,
            component: LabelTag,
            props: {
               tooltip: localize(getShieldTraitDescription($document.system.trait[idx].name)),
               label: localize($document.system.trait[idx].name),
            }
         });
      }
   }
</script>

<ItemSheetSidebarTraits inTags={tags}/>
