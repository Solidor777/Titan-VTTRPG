<script>
   import ItemSheetSidebar from '~/document/types/item/sheet/ItemSheetSidebar.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import ActiveEffectSheetTabs from '~/document/types/active-effect/sheet/ActiveEffectSheetTabs.svelte';
   import ActiveEffectSheetHeader from '~/document/types/active-effect/sheet/ActiveEffectSheetHeader.svelte';
</script>

<ItemSheetBase
   header={ActiveEffectSheetHeader}
   sidebar={ItemSheetSidebar}
   tabs={ActiveEffectSheetTabs}
/>
