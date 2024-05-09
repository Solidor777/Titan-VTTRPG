<script>
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import ShieldSheetHeader from '~/document/types/item/types/shield/sheet/ShieldSheetHeader.svelte';
   import ShieldSheetSidebar from '~/document/types/item/types/shield/sheet/ShieldSheetSidebar.svelte';
   import ShieldSheetTabs from '~/document/types/item/types/shield/sheet/ShieldSheetTabs.svelte';
</script>

<ItemSheetBase
   header={ShieldSheetHeader}
   sidebar={ShieldSheetSidebar}
   tabs={ShieldSheetTabs}
/>
