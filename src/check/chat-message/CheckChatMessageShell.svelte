<script>
   import CheckLabel from "./components/CheckLabel.svelte";
   import CheckDiceContainer from "./components/CheckDiceContainer.svelte";
   import CheckResults from "./components/CheckResults.svelte";

   // Context object
   export let chatContext = void 0;

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
         default: {
            return "";
         }
      }
   }
</script>

<div class="check-chat-message">
   <div class="label {getLabelClass()}">
      <CheckLabel label={chatContext.label} typeLabel={chatContext.typeLabel} />
   </div>
   <CheckDiceContainer dice={chatContext.results.dice} />
   <CheckResults results={chatContext.results} />
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   @import "../../styles/Variables.scss";

   .check-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .label {
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
      }
   }
</style>
