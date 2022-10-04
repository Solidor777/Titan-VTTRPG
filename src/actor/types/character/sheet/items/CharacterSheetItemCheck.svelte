<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import OpposedCheckTag from "~/helpers/svelte-components/tag/OpposedCheckTag.svelte";
   import ResistedByTag from "~/helpers/svelte-components/tag/ResistedByTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import CharacterSheetItemCheckButton from "./CharacterSheetItemCheckButton.svelte";
   import IconStatTag from "~/helpers/svelte-components/tag/IconStatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the docuement
   const document = getContext("DocumentStore");

   // Reference to the item
   export let item = void 0;

   // The idx of the check
   export let checkIdx = void 0;

   // Reference to the weapon id
   $: check = item.system.check[checkIdx];
</script>

<!--Check-->
{#if check}
   <div class="check">
      <!--Button-->
      <div class="button">
         <CharacterSheetItemCheckButton
            {check}
            on:click={() => {
               application.rollItemCheck(item._id, checkIdx);
            }}
         />
      </div>

      <div class="stats">
         <!--Attribute and skill-->
         <div class="stat">
            <AttributeTag
               attribute={check.attribute}
               label={`${localize(check.attribute)} (${localize(check.skill)}) ${check.difficulty}:${check.complexity}`}
            />
         </div>

         <!--Dice-->
         <div class="stat">
            <IconStatTag
               label={localize("dice")}
               value={$document.system.attribute[check.attribute].value +
                  $document.system.skill[check.skill].training.value}
               icon={"fas fa-dice-d6"}
            />
         </div>

         <!--Training-->
         {#if $document.system.skill[check.skill].training.value !== 0}
            <div class="stat">
               <IconStatTag
                  label={localize("training")}
                  value={$document.system.skill[check.skill].training.value}
                  icon={"fas fa-dumbbell"}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if $document.system.skill[check.skill].expertise.value !== 0}
            <div class="stat">
               <IconStatTag
                  label={localize("expertise")}
                  value={$document.system.skill[check.skill].expertise.value}
                  icon={"fas fa-graduation-cap"}
               />
            </div>
         {/if}

         <!--Resolve Cost-->
         {#if check.resolveCost > 0}
            <div class="stat">
               <StatTag label={localize("resolveCost")} value={check.resolveCost} />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if check.resistanceCheck !== "none"}
            <div class="stat">
               <ResistedByTag resistance={check.resistanceCheck} />
            </div>
         {/if}

         <!--Opposed Check-->
         {#if check.opposedCheck.enabled}
            <div class="stat">
               <OpposedCheckTag opposedCheck={check.opposedCheck} />
            </div>
         {/if}
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;
         flex-wrap: wrap;

         .stat {
            @include tag-padding;
         }
      }
   }
</style>
