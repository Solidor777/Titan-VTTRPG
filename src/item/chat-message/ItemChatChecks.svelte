<script>
   import { localize } from "~/helpers/Utility.js";
   import OpposedCheckTag from "~/helpers/svelte-components/tag/OpposedCheckTag.svelte";
   import ResistedByTag from "~/helpers/svelte-components/tag/ResistedByTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";
   import ItemCheckButton from "~/helpers/svelte-components/button/ItemCheckButton.svelte";
   import TitanItemCheck from "~/check/types/item-check/ItemCheck.js";

   export let item = void 0;

   function getTagFromCheck(check) {
      let retVal = localize(`${check.attribute}`);
      if (check.skill && check.skill !== "none") {
         retVal += ` (${localize(`${check.skill}`)})`;
      }
      retVal += ` ${check.difficulty}`;
      if (check.complexity) {
         retVal += `:${check.complexity}`;
      }

      return retVal;
   }

   async function rollItemCheck(check, idx) {
      const controlledTokens = Array.from(canvas.tokens.controlled);
      if (controlledTokens.length > 0) {
         // Initial roll data
         const itemRollData = item.system;
         itemRollData.name = item.name;
         itemRollData.img = item.img;

         // Roll for each controlled token
         for (let tokenIdx = 0; tokenIdx < controlledTokens.length; tokenIdx++) {
            // If the target is valid
            const actor = controlledTokens[tokenIdx]?.actor;
            if (actor && actor.system.resource?.stamina) {
               // Get the actor roll data
               const actorRollData = actor.getRollData();

               // Get a new item check
               const itemCheck = new TitanItemCheck({
                  actorRollData: actorRollData,
                  itemRollData: itemRollData,
                  checkIdx: idx,
               });
               await itemCheck.evaluateCheck();
               await itemCheck.sendToChat({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor: actor }),
                  rollMode: game.settings.get("core", "rollMode"),
               });
            }
         }
      }
   }
</script>

<ol>
   <!--Each check-->
   {#each item.system.check as check, idx}
      <li>
         <!--Header-->
         <div class="button">
            <ItemCheckButton
               {check}
               on:click={() => {
                  rollItemCheck(check, idx);
               }}
            />
         </div>

         <div class="tags">
            <!--Main Check Stats -->
            <div class="tag">
               <AttributeTag label={getTagFromCheck(check)} attribute={check.attribute} />
            </div>

            <!--DC-->
            <div class="stat label" />

            <!--Resolve Cost-->
            {#if check.resolveCost > 0}
               <div class="tag">
                  <StatTag label={localize("resolveCost")} value={check.resolveCost} />
               </div>
            {/if}

            <!--Resistance Check-->
            {#if check.resistanceCheck !== "none"}
               <div class="tag">
                  <ResistedByTag resistance={check.resistanceCheck} />
               </div>
            {/if}

            <!--Opposed Check-->
            {#if check.opposedCheck.enabled}
               <div class="tag">
                  <OpposedCheckTag opposedCheck={check.opposedCheck} />
               </div>
            {/if}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;
      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
         }

         .button {
            @include flex-row;
            @include flex-group-center;
         }

         .tags {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;
            flex-wrap: wrap;

            .tag {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>
