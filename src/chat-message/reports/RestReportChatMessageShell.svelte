<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="healing-report">
   <div class="label">
      <i class="fas fa-bed" />
      {localize("tookARest")}
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

   <!--Wounds Healed-->
   {#if chatContext.woundsHealed}
      <div class="stat">
         <div class="stat-label">
            {localize("woundsHealed")}:
         </div>

         <div class="value">1</div>
      </div>

      <div class="stat">
         <div class="stat-label">
            {localize("wounds")}:
         </div>

         <div class="value">{chatContext.wounds} / {chatContext.maxWounds}</div>
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .healing-report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      padding: (0.25rem);
      font-weight: bold;

      i {
         margin-right: 0.25rem;
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

      .stat {
         @include flex-row;
         margin-top: 0.5rem;

         .value {
            font-weight: normal;
            margin-left: 0.25rem;
         }
      }
   }
</style>
