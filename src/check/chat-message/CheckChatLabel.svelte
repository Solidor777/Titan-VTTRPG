<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Main label
   let label = $document.flags.titan.data.chatContext.label;

   // Type label
   let typeLabel = $document.flags.titan.data.chatContext.typeLabel;

   function getLabelClass() {
      const chatContext = $document.flags.titan.data.chatContext;
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
         default: {
            return "";
         }
      }
   }
</script>

<div class="label {getLabelClass()}">
   <!--Main Label -->
   <div class="main-label">
      {label}
   </div>

   <!--Sub Label -->
   {#if typeLabel}
      <div class="sub-label">
         {typeLabel}
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
         margin-top: 0.25rem;
         font-size: 0.9rem;
      }
   }
</style>
