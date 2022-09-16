<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="label {chatContext.system.check.attribute}">
   <!--Image-->
   {#if chatContext.img}
      <img src={chatContext.img} alt="item" />
   {/if}

   <!--Text Label-->
   <div class="label-text">
      <!--Main Label-->
      <div class="main-label">
         {chatContext.name}
      </div>

      <!--Sub Label-->
      <div class="sub-label">
         {localize(`${chatContext.system.check.attribute}`)}
         ({localize(`${chatContext.system.check.skill}`)})
         {chatContext.system.check.difficulty}:{chatContext.system.check.complexity}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      @include attribute-colors;
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
            font-size: 1.2rem;
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
