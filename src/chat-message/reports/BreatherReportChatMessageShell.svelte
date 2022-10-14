<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <img src={chatContext.actorImg} alt="img" />

   <div class="label">
      <i class="fas fa-face-exhaling" />
      {localize("tookABreather")}
      <div class="name">
         {chatContext.actorName}
      </div>
   </div>

   <!--Sub label-->
   <div class="sub-label">
      {localize("removeTemporaryEffects.desc")}
   </div>

   <!--Sub label-->
   <div class="sub-label">
      {localize("takeABreather.desc")}
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      padding: (0.25rem);
      font-weight: bold;

      i {
         margin-right: 0.25rem;
      }

      img {
         border: none;
         height: 5rem;
         margin-bottom: 0.5rem;
      }

      .label {
         @include font-size-large;
         @include border;
         @include panel-2;
         width: 100%;
         padding: 0.25rem;

         .name {
            @include font-size-normal;
            margin-top: 0.25rem;
         }
      }

      .sub-label {
         @include font-size-normal;
         margin-top: 0.5rem;
      }
   }
</style>
