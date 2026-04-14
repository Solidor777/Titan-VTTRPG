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

   /** @type {SvelteComponent}[] List of Svelte Components that make up the sections of the sidebar. */
   const sections = [
      CharacterSheetPortrait,
      CharacterSheetResources,
      CharacterSheetRatings,
      CharacterSheetMods,
      CharacterSheetSpeeds
   ];
</script>

<DocumentSheetSidebar {sections}></DocumentSheetSidebar>
