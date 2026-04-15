<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import DocumentSheetScrollingSidebar from '~/document/sheet/DocumentSheetScrollingSidebar.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @type {object[]}
    * Each section of the Sidebar.
    * Only includes the Checks section if the item has checks.
    * Always includes the Traits section since custom traits are added from the Sidebar.
    */
   $: sections =
      $document.system.check.length > 0
         ? [ItemSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ItemSheetSidebarTraits];
</script>

<DocumentSheetScrollingSidebar {sections}/>
