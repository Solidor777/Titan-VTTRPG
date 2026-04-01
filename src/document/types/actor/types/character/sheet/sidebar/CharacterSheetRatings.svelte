<script>
   import { getContext } from 'svelte';
   import CharacterSheetRating from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRating.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';

   /** @type {object} Reference to the Document store. */
   const document = getContext('document');

</script>

<BorderedColumnList
   entries={[
      {rating: 'initiative', onClick: () => $document.system.requestInitiativeRoll()},
      {rating: 'awareness'},
      {rating: 'defense'},
      {rating: 'melee'},
      {rating: 'accuracy'}
]}
   entryComponent={CharacterSheetRating}
/>
