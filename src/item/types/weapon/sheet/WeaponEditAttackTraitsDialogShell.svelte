<svelte:options accessors={true} />

<script>
   import DocumentEditTraitsDialog from '~/documents/components/DocumentEditTraitsDialog.svelte';

   // The weapon document owning the attack
   export let document = void 0;

   // The attack idx
   export let attackIdx = void 0;

   // Trait options
   let traitOptions = [
      {
         name: 'blast',
         type: 'number',
         value: 0,
      },
      {
         name: 'cleave',
         type: 'boolean',
         value: false,
      },
      {
         name: 'close',
         type: 'boolean',
         value: false,
      },
      {
         name: 'crushing',
         type: 'boolean',
         value: false,
      },
      {
         name: 'ineffective',
         type: 'boolean',
         value: false,
      },
      {
         name: 'loud.attack',
         type: 'boolean',
         value: false,
      },
      {
         name: 'magical.attack',
         type: 'boolean',
         value: false,
      },
      {
         name: 'flurry',
         type: 'boolean',
         value: false,
      },
      {
         name: 'penetrating',
         type: 'boolean',
         value: false,
      },
      {
         name: 'piercing',
         type: 'boolean',
         value: false,
      },
      {
         name: 'reload',
         type: 'boolean',
         value: false,
      },
      {
         name: 'rend',
         type: 'boolean',
         value: false,
      },
      {
         name: 'restraining',
         type: 'boolean',
         value: false,
      },
      {
         name: 'slashing',
         type: 'boolean',
         value: false,
      },
      {
         name: 'splash',
         type: 'number',
         value: 0,
      },
      {
         name: 'twoHanded',
         type: 'boolean',
         value: false,
      },
   ];
</script>

<div class="edit-traits-dialog">
   <DocumentEditTraitsDialog
      {document}
      bind:documentTraits={document.system.attack[attackIdx].trait}
      bind:traitOptions
   />
</div>

<style lang="scss">
   .edit-traits-dialog {
      --trait-column-count: 2;
   }
</style>
