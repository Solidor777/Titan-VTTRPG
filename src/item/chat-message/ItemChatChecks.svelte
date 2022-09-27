<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import OpposedCheckTag from "~/helpers/svelte-components/tag/OpposedCheckTag.svelte";
   import ResistedByTag from "~/helpers/svelte-components/tag/ResistedByTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";

   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;

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
</script>

<!--Check-->
<div class="checks">
   {#each chatContext.system.check as check}
      <div class="check">
         <!--Check header-->
         <div class="header {check.attribute}">
            {check.label}
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
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .checks {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .check {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
         }

         .header {
            @include flex-row;
            @include flex-group-center;
            @include border;
            @include attribute-colors;
            padding: 0.5rem;
            width: 100%;
            font-weight: bold;
            @include font-size-normal;
         }

         .tags {
            @include flex-row;
            @include flex-group-center;
            flex-wrap: wrap;
            .tag {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>
