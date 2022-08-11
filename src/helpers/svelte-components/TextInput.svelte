<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value;
</script>

<input bind:value on:change />

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
