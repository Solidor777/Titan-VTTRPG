<script>
   import WeaponSheetHeader from '~/document/types/item/types/weapon/sheet/WeaponSheetHeader.svelte';
   import WeaponSheetSidebar from '~/document/types/item/types/weapon/sheet/WeaponSheetSidebar.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import WeaponSheetTabs from '~/document/types/item/types/weapon/sheet/WeaponSheetTabs.svelte';
</script>

<ItemSheetBase
   header={WeaponSheetHeader}
   sidebar={WeaponSheetSidebar}
   tabs={WeaponSheetTabs}
/>
