<script>
   // The value of the input
   export let value;
   export let disabled = false;
</script>

<input bind:value on:change on:keyup {disabled} />

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   input {
      @include input;
   }
</style>
