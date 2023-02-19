<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value;

   export let disabled = false;
</script>

<input type="checkbox" bind:checked={value} {disabled} on:change />
