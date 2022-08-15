<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Chat context
   const chatContext = $document.flags.titan.data.chatContext;

   function getLabelClass() {
      switch (chatContext.type) {
         case "resistanceCheck": {
            return chatContext.parameters.resistance;
         }
         case "attributeCheck": {
            return chatContext.parameters.attribute;
         }
         case "skillCheck": {
            return chatContext.parameters.attribute;
         }
         case "attackCheck": {
            return chatContext.parameters.attribute;
         }
         default: {
            return "";
         }
      }
   }
</script>

<div class="label {getLabelClass()}">
   <!--Main Label -->
   <div class="main-label">
      {chatContext.label}
   </div>

   <!--Sub Label -->
   {#if chatContext.typeLabel}
      <div class="sub-label">
         {chatContext.typeLabel}
      </div>
   {/if}

   {#if chatContext.type === "attackCheck" && chatContext.parameters.targetDefense !== false}
      <div class="sub-label">
         {#if chatContext.parameters.type === "melee"}
            {localize("LOCAL.melee.label")}
            ({chatContext.parameters.attackerMelee})
         {:else}
            {localize("LOCAL.accuracy.label")}
            ({chatContext.parameters.attackerAccuracy})
         {/if}
         {localize("LOCAL.versus.label")}
         {localize("LOCAL.defense.label")}
         ({chatContext.parameters.targetDefense})
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include border;
      @include flex-column;
      padding: 0.5rem;
      align-items: flex-start;

      &.body {
         --label-background-color: var(--body-color-bright);
      }
      &.mind {
         --label-background-color: var(--mind-color-bright);
      }
      &.soul {
         --label-background-color: var(--soul-color-bright);
      }
      &.reflexes {
         --label-background-color: var(--reflexes-color-bright);
      }
      &.resilience {
         --label-background-color: var(--resilience-color-bright);
      }
      &.willpower {
         --label-background-color: var(--willpower-color-bright);
      }

      background-color: var(--label-background-color);

      .main-label {
         font-size: 1.2rem;
         font-weight: bold;
      }

      .sub-label {
         font-weight: bold;
         margin-top: 0.25rem;
         font-size: 0.9rem;
      }
   }
</style>
