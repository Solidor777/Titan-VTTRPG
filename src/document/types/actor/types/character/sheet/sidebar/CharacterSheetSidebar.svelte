<script>
   import CharacterSheetResources
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte';
   import CharacterSheetMods from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte';
   import CharacterSheetRatings
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRatings.svelte';
   import CharacterSheetSpeeds from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSpeeds.svelte';
   import CharacterSheetPortrait
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte';
   import DocumentSheetSidebar from '~/document/sheet/DocumentSheetSidebar.svelte';

   /**
    * @type {(SvelteComponent | import('~/document/sheet/DocumentSheetSidebar.svelte').DocumentSheetSidebarSection)[]}
    * List of sections that make up the sidebar. Portrait and Resources render bare; Ratings, Mods, and Speeds render
    * with an uppercase section label above them.
    */
   const sections = [
      CharacterSheetPortrait,
      CharacterSheetResources,
      { component: CharacterSheetRatings, label: 'ratings' },
      { component: CharacterSheetMods, label: 'mods' },
      { component: CharacterSheetSpeeds, label: 'speeds' }
   ];
</script>

<DocumentSheetSidebar {sections}></DocumentSheetSidebar>
