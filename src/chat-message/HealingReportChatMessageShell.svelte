<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="healing-report">
   <!--Header-->
   <div class="header">
      <div class="label">
         <i class="fas fa-heart" />{localize("healingReport")}
      </div>
      <div class="name">
         {chatContext.actorName}
      </div>
   </div>

   <!--Stamina healed-->
   <div class="row">
      <div class="label">
         {localize("staminaHealed")}:
      </div>
      <div class="value">
         {chatContext.healing}
      </div>
   </div>

   <!--Stamina-->
   <div class="row">
      <div class="label">
         {localize("stamina")}:
      </div>
      <div class="value">
         {chatContext.stamina.value} / {chatContext.stamina.maxValue}
      </div>
   </div>

   <!--Wounds-->
   <div class="row">
      <div class="label">
         {localize("wounds")}:
      </div>
      <div class="value">
         {chatContext.wounds.value} / {chatContext.wounds.maxValue}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../styles/Mixins.scss";
   @import "../styles/Variables.scss";

   .healing-report {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      font-size: 1rem;

      .header {
         @include border;
         width: 100%;
         padding: (0.25rem);
         font-weight: bold;
         background: var(--label-background-color);

         i {
            margin-right: 0.25rem;
         }

         .label {
            font-size: 1.25rem;
         }

         .name {
            font-size: 1.1rem;
         }
      }

      .row {
         @include flex-row;
         margin-top: 0.5rem;

         .label {
            font-weight: bold;
         }

         .value {
            margin-left: 0.25rem;
         }
      }
   }
</style>
