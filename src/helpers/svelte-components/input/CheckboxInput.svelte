<script>
   /** @type boolean The value that this input should modify. */
   export let value;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<input bind:checked={value} {disabled} on:change type="checkbox"/>
