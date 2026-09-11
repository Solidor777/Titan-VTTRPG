<script>
   import CharacterSheetResource
   from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
</script>

<BorderedColumnList
   entries={[
      {resource: 'stamina'},
      {resource: 'wounds'},
      {resource: 'resolve'},
   ]}
   entryComponent={CharacterSheetResource}
/>
