<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   const document = getContext("DocumentStore");

   // Chat context
   const chatContext = $document.flags.titan.chatContext;

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
         case "castingCheck": {
            return chatContext.parameters.attribute;
         }
         case "itemCheck": {
            return chatContext.parameters.attribute;
         }
         default: {
            return "";
         }
      }
   }
</script>

<div class="label {getLabelClass()}">
   <!--Image-->
   {#if chatContext.img}
      <img src={chatContext.img} alt="item" />
   {/if}

   <!--Main Label -->
   <div class="label-text">
      <div class="main-label">
         {chatContext.label}
      </div>

      <!--Sub Label -->
      {#if chatContext.subLabels}
         {#each chatContext.subLabels as subLabel}
            <div class="sub-label">
               {subLabel}
            </div>
         {/each}
      {/if}
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      @include attribute-colors;
      @include resistance-colors;
      padding: 0.5rem;
      font-weight: bold;

      .label-text {
         @include flex-column;
         align-items: flex-start;
         justify-content: center;

         .main-label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            @include font-size-large;
            font-weight: bold;
         }

         .sub-label {
            margin-top: 0.25rem;
         }
      }

      img {
         margin-right: 0.5rem;
         background: black;
         border-radius: 10px;
         width: 2.5rem;
      }
   }
</style>
