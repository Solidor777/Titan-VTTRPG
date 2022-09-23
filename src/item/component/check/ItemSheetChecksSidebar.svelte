<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import ResistanceTag from "~/helpers/svelte-components/tag/ResistanceTag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "../../../helpers/svelte-components/tag/AttributeTag.svelte";

   // Document reference
   const document = getContext("DocumentStore");
</script>

<ol>
   {#each $document.system.check as check, idx (check.uuid)}
      <li transition:slide|local>
         <!--Check-->
         <div class="header {check.attribute}">
            <!--Header-->
            <div class="label">
               {check.label}
            </div>

            <!--Value-->
            <div class="value">
               {#if check.skill !== "none"}
                  {localize(check.attribute)} {localize(check.skill)} {check.difficulty}:{check.complexity}
               {:else}
                  {localize(check.attribute)} {check.difficulty}:{check.complexity}
               {/if}
            </div>
         </div>

         {#if check.resolveCost > 0 || (check.resistanceCheck !== "none" && check.opposedCheck.enabled === true)}
            <div class="stats" transition:slide|local>
               <!--Resolve Cost-->
               {#if check.resolveCost > 0}
                  <div class="stat" transition:slide|local>
                     <StatTag label={localize("resolveCost")} value={check.resolveCost} />
                  </div>
               {/if}

               <!--Resistance Check-->
               {#if check.resistanceCheck !== "none"}
                  <div class="labeled-stat" transition:slide|local>
                     <!--Label-->
                     <div class="label">
                        {localize("resistedBy")}
                     </div>

                     <!--Value-->
                     <div class="value">
                        <ResistanceTag resistance={check.resistanceCheck} />
                     </div>
                  </div>
               {/if}

               <!--Opposed Check-->
               {#if check.opposedCheck.enabled === true}
                  <div class="labeled-stat" transition:slide|local>
                     <!--Label-->
                     <div class="label">
                        {localize("opposedBy")}
                     </div>

                     <!--Value-->
                     <div class="value attribute {check.opposedCheck.attribute}">
                        {#if check.opposedCheck.skill !== "none"}
                           <AttributeTag
                              label={`${localize(check.opposedCheck.attribute)} (${localize(
                                 check.opposedCheck.skill
                              )})`}
                              attribute={check.opposedCheck.attribute}
                           />
                        {:else}
                           <AttributeTag
                              label={localize(check.opposedCheck.attribute)}
                              attribute={check.opposedCheck.attribute}
                           />
                           {localize(`${check.opposedCheck.attribute}`)}
                        {/if}
                     </div>
                  </div>
               {/if}
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
         }

         .header {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom;
            @include border-right;
            @include attribute-colors;
            padding: 0.25rem 0;
            width: 100%;

            .label {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
               font-weight: bold;
            }

            .value {
               margin-top: 0.25rem;
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;
            width: calc(100% - 0.5rem);
            flex-wrap: wrap;
            padding: 0 0.5rem 0.5rem 0.5rem;

            .stat {
               @include flex-row;
               @include flex-group-center;
               margin-top: 0.5rem;
            }

            .labeled-stat {
               @include flex-column;
               @include flex-group-top;
               margin-top: 0.5rem;

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  font-size: 0.9rem;
                  font-weight: bold;
               }

               .value {
                  @include flex-row;
                  @include flex-group-center;
                  margin-top: 0.25rem;
               }
            }
         }
      }
   }
</style>
