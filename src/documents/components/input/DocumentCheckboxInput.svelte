<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   // The value of the input
   export let value;

   // Document reference
   const document = getContext('DocumentStore');

   export let disabled = false;
</script>

<CheckboxInput
   bind:value
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={async () => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
