<script>
   export let options = void 0;
   export let value = void 0;
   export let disabled = false;
</script>

<select bind:value selected={value} on:change {disabled}>
   {#each options as option}
      <option value={option}>
         {option}
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
