<script>
   export let value = void 0;
</script>

<textarea bind:value on:change />

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   textarea {
      @include input;
      @include flex-row;
      @include flex-group-left;
      flex-wrap: wrap;
      width: 100%;
      height: 100%;
   }
</style>
