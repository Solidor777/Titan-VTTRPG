<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";

   // Setup
   const document = getContext("DocumentStore");
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={"img"} alt={"item portrait"} />
   </div>

   <!--Name-->
   <div class="name">
      <DocumentName />
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .header {
      @include border;
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      padding: 0.5rem;

      .portrait {
         width: 2.5rem;
         --border-style: none;
         margin-right: 0.5rem;
      }

      .name {
         @include flex-row;
         @include flex-group-left;
         width: 100%;
      }
   }
</style>
