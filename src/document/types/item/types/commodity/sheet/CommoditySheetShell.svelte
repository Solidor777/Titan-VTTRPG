<script>
   import ItemSheetSidebar from '~/document/types/item/sheet/ItemSheetSidebar.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import CommoditySheetHeader from '~/document/types/item/types/commodity/sheet/CommoditySheetHeader.svelte';
   import CommoditySheetTabs from '~/document/types/item/types/commodity/sheet/CommoditySheetTabs.svelte';
</script>

<ItemSheetBase
   header={CommoditySheetHeader}
   sidebar={ItemSheetSidebar}
   tabs={CommoditySheetTabs}
/>
