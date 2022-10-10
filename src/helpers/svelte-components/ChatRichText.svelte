<script>
   import RichText from "~/helpers/svelte-components/RichText.svelte";

   export let text = void 0;
</script>

<div class="notes">
   <RichText {text} />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .notes {
      @include font-size-normal;
      width: 100%;
   }
</style>
