<script>
   export let text = void 0;
</script>

<div class="text">{@html text}</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .text {
      @include font-size-normal;
      width: 100%;
   }
</style>
