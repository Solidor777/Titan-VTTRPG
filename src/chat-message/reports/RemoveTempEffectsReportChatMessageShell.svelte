<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="healing-report">
   <div class="label">
      <i class="fas fa-arrow-rotate-left" />{chatContext.actorName}
   </div>
   <!--Sub label-->
   <div class="sub-label">
      {localize("removeTemporaryEffects.desc")}
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .healing-report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      @include panel-2;
      @include border;
      width: 100%;
      padding: (0.25rem);
      font-weight: bold;

      i {
         margin-right: 0.25rem;
      }

      .label {
         @include font-size-large;
      }

      .sub-label {
         @include font-size-normal;
         margin-top: 0.5rem;
      }
   }
</style>
