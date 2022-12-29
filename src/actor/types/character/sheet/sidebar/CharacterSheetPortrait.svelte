<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import tooltip from "~/helpers/svelte-actions/Tooltip.js"
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   const application = getContext("external").application;
   const document = getContext("DocumentStore");
</script>

<div class="portrait">
   <div class="image">
      <DocumentImagePicker path={"img"} alt={"character portrait"} />
   </div>
   <!--Rest Button-->
   <div class="button rest" use:tooltip={{content: localize("rest")}}>
      <IconButton
         icon={"fas fa-bed"}
         on:click={() => {
            application.rest(true);
         }}
      />
   </div>

   <!--Take a Breather Button-->
   <div class="button breather" use:tooltip={{content: localize("takeABreather")}}>
      <IconButton
         icon={"fas fa-face-exhaling"}
         on:click={() => {
            application.takeABreather(true);
         }}
      />
   </div>

   <!--Reset Temp Effects button-->
   <div class="button clear" use:tooltip={{content: localize("removeTemporaryEffects")}}>
      <IconButton
         icon={"fas fa-arrow-rotate-left"}
         on:click={() => {
            application.removeTemporaryEffects(true);
         }}
      />
   </div>

   <!--Spend Resolve button-->
   <div class="button resolve" use:tooltip={{content: localize("spendResolve")}}>
      <IconButton
         icon={"fas fa-bolt"}
         on:click={() => {
            $document.typeComponent.spendResolve(true);
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

         &.rest {
            top: 0;
            left: 0;
         }

         &.breather {
            top: 0;
            right: 0;
         }

         &.clear {
            bottom: 0;
            left: 0;
         }

         &.resolve {
            bottom: 0;
            right: 0;
         }
      }
   }
</style>
