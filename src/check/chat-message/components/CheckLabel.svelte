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
   @import "../../../styles/mixins.scss";
   .label {
      @include border-normal;
      @include flex-column;
      padding: 0.5rem;
      align-items: flex-start;

      &.body {
         --color-background-label: var(--color-body-bright);
      }
      &.mind {
         --color-background-label: var(--color-mind-bright);
      }
      &.soul {
         --color-background-label: var(--color-soul-bright);
      }
      &.reflexes {
         --color-background-label: var(--color-reflexes-bright);
      }
      &.resilience {
         --color-background-label: var(--color-resilience-bright);
      }
      &.willpower {
         --color-background-label: var(--color-willpower-bright);
      }

      background-color: var(--color-background-label);

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
