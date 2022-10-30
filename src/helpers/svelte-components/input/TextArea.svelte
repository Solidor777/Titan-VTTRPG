<script>
   export let value = void 0;
   export let disabled = false;
</script>

<textarea bind:value on:change {disabled} />

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
