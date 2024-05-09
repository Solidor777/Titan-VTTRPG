<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/component/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarBase from '~/document/types/item/sheet/ItemSheetSidebarBase.svelte';
   import ShieldSheetSidebarTraits from '~/document/types/item/types/shield/sheet/ShieldSheetSidebarTraits.svelte';

   // Application statee reference
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [ShieldSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ShieldSheetSidebarTraits];
</script>

<ItemSheetSidebarBase {sections} />
