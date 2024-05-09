<script>
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import ItemSheetSidebar from '~/document/types/item/sheet/ItemSheetSidebar.svelte';
   import EquipmentSheetHeader from '~/document/types/item/types/equipment/sheet/EquipmentSheetHeader.svelte';
   import EquipmentSheetTabs from '~/document/types/item/types/equipment/sheet/EquipmentSheetTabs.svelte';
</script>

<ItemSheetBase
   header={EquipmentSheetHeader}
   sidebar={ItemSheetSidebar}
   tabs={EquipmentSheetTabs}
/>
