<script>
   export let options = void 0;
   export let value = void 0;
</script>

<select bind:value selected={value}>
   {#each options as option}
      <option value={option}>
         {option}
      </option>
   {/each}
</select>
