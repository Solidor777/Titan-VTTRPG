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
   @import "../../../styles/Mixins.scss";

   select {
      @include input;

      &:disabled {
         @include input-disabled;
      }
   }
</style>
