<script>
   export let options = void 0;
   export let value = void 0;
</script>

<select bind:value selected={value} on:change>
   {#each options as option}
      <option value={option}>
         {option}
      </option>
   {/each}
</select>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   select {
      @include input;
   }
</style>
