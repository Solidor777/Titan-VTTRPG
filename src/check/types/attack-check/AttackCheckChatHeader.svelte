<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

   // Document reference
   const document = getContext("DocumentStore");
</script>

<div class="label">
   <div class="content {$document.flags.titan.chatContext.parameters.attribute}">
      <img
         src={$document.flags.titan.chatContext.parameters.img}
         alt="item"
         class={$document.flags.titan.chatContext.parameters.img.indexOf(".svg") === -1 ? "" : "svg"}
      />

      <!--Labels-->
      <div class="labels">
         <!--Label-->
         <div class="label">
            {$document.flags.titan.chatContext.parameters.itemName}
         </div>

         <!--Attack -->
         <div class="sub-label">
            {$document.flags.titan.chatContext.parameters.attack.label}
         </div>

         <!--Type Label -->
         <div class="sub-label">
            {`${localize($document.flags.titan.chatContext.parameters.attribute)} (${localize(
               $document.flags.titan.chatContext.parameters.skill
            )}) ${$document.flags.titan.chatContext.parameters.difficulty}:${
               $document.flags.titan.chatContext.parameters.complexity
            }`}
         </div>

         <!--Target defense-->
         {#if $document.flags.titan.chatContext.parameters.targetDefense !== undefined}
            {`${
               $document.flags.titan.chatContext.parameters.type === "melee"
                  ? `${localize("melee")}`
                  : `${localize("accuracy")}`
            } ${$document.flags.titan.chatContext.parameters.attackerRating} ${localize("versus")} ${localize(
               "defense"
            )} ${$document.flags.titan.chatContext.parameters.targetDefense}`}
         {/if}

         <!--Damage -->
         <div class="sub-label">
            {`${localize("damage")}: 
            ${$document.flags.titan.chatContext.parameters.attack.damage + $document.flags.titan.chatContext.parameters.damageMod}
            ${$document.flags.titan.chatContext.parameters.attack.plusExtraSuccessDamage ? ` + ${localize("extraSuccesses.short")}` : ""}`}
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      width: 100%;

      .content {
         @include flex-row;
         @include flex-group-left;
         @include attribute-colors;
         @include border;
         @include label;
         padding: 0.5rem;
         font-weight: bold;

         img {
            width: 2rem;
            border: none;
            margin-right: 0.25rem;
         }

         .labels {
            @include flex-column;
            @include flex-group-top-left;
            .label {
               @include flex-row;
               @include font-size-large;
            }

            .sub-label {
               @include flex-row;
               @include font-size-small;
            }
         }
      }
   }
</style>
