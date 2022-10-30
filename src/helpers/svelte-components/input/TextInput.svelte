<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value;
   export let disabled = false;
</script>

<input bind:value on:change {disabled} />

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
