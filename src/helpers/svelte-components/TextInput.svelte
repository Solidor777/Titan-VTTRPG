<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value;
</script>

<input bind:value />

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
