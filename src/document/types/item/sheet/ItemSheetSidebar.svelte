<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarCustomTraits from '~/document/types/item/sheet/ItemSheetSidebarCustomTraits.svelte';
   import ItemSheetSidebarSections from '~/document/types/item/sheet/ItemSheetSidebarSections.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /**
    * Each section of the Sidebar.
    * Only include Checks section if the item has checks.
    * Always include Traits since those are added from the Sidebar.
    */
   $: sections =
      $document.system.check.length > 0
         ? [ItemSheetSidebarCustomTraits, ItemSheetSidebarChecks]
         : [ItemSheetSidebarCustomTraits];
</script>

<ItemSheetSidebarSections {sections}/>
