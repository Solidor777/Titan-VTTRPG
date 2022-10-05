<script>
   import { localize } from "~/helpers/Utility.js";
   import OpposedCheckTag from "~/helpers/svelte-components/tag/OpposedCheckTag.svelte";
   import ResistedByTag from "~/helpers/svelte-components/tag/ResistedByTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";

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
</script>

<ol>
   <!--Each check-->
   {#each item.system.check as check}
      <li>
         <!--Header-->
         <div class="header {check.attribute}">
            <!--Icon-->
            <i class="fas fa-dice" />

            <!--Label-->
            <div>{check.label}</div>
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

         .header {
            @include flex-row;
            @include flex-group-center;
            @include font-size-normal;
            @include border;
            @include attribute-colors;
            padding: 0.25rem;
            font-weight: bold;

            i {
               margin-right: 0.25rem;
            }
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
