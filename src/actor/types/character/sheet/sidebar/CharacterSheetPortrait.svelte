<script>
   import { getContext } from "svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   const application = getContext("external").application;
</script>

<div class="portrait">
   <div class="image">
      <DocumentImagePicker path={"img"} alt={"character portrait"} />
   </div>
   <!--Rest Button-->
   <div class="button">
      <IconButton
         icon={"fas fa-campground"}
         on:click={() => {
            application.rest();
         }}
      />
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .portrait {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      position: relative;

      .image {
         width: 10rem;
         --border-style: none;
      }

      .button {
         position: absolute;
         top: 0;
         left: 0;
      }
   }
</style>
