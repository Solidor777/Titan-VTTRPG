<script>
   // Reference to the item description
   export let text = void 0;
</script>

<div class="text">{@html text}</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .text {
      overflow: hidden;
      text-align: left;
      margin: 0rem 0.25rem;
   }
</style>
