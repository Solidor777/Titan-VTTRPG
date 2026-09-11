<script>
   import CharacterSheetAttribute
   from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttribute.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
</script>

<BorderedColumnList
   entries={[
      {attribute: 'body'},
      {attribute: 'mind'},
      {attribute: 'soul'},
   ]}
   entryComponent={CharacterSheetAttribute}
></BorderedColumnList>
