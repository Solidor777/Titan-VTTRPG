<script>
   export let options = void 0;
   export let value = void 0;
   export let disabled = false;
</script>

<select bind:value on:change selected={value} {disabled}>
   {#each options as option}
      <option value={option.value}>
         {option.label}
      </option>
   {/each}
</select>

<style lang="scss">
   select {
      @include input;

      option {
         @include flex-group-left;
      }

      &:disabled {
         @include input-disabled;
      }
   }
</style>
