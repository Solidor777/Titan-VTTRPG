<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Reference to the weapon item
   const document = getContext("DocumentSheetObject");
</script>

<div class="weapon-description-tab">
   <div class="scrolling-content">
      <ScrollingContainer>Description tab</ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .weapon-description-tab {
      @include flex-column;
      @include flex-group-center;
      height: 100%;
      width: 100%;

      .scrolling-content {
         height: 100%;
         width: 100%;
      }
   }
</style>
