<script>
   /** @type boolean The value to bind to the input. */
   export let value;

   /** @type boolean Whether the input is currently disabled. */
   export let disabled = false;
</script>

<input bind:checked={value} {disabled} on:change type="checkbox"/>
