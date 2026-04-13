<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import DocumentSheetScrollingSidebar from '~/document/sheet/DocumentSheetScrollingSidebar.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Each section of the Sidebar.
    * Only include Checks section if the item has checks.
    * Always include Traits since those are added from the Sidebar.
    */
   $: sections =
      $document.system.check.length > 0
         ? [ItemSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ItemSheetSidebarTraits];
</script>

<DocumentSheetScrollingSidebar {sections}/>
