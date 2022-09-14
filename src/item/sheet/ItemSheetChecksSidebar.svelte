<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { spring } from "svelte/motion";
   import ResistanceTag from "~/helpers/svelte-components/ResistanceTag.svelte";
   import StatTag from "~/helpers/svelte-components/StatTag.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application staore reference
   const appState = getContext("ApplicationStateStore");

   $: checks = $document.system.check;
</script>

<ol>
   {#each checks as check}
      <li>
         <!--Check-->
         <div class="check {check.attribute}">
            <!--Header-->
            <div class="label">
               {check.label}
            </div>

            <!--Value-->
            <div class="value">
               {#if check.skill !== "none"}
                  {`${localize(`LOCAL.${check.attribute}.label`)} (${localize(`LOCAL.${check.skill}.label`)}) ${
                     check.difficulty
                  }:${check.complexity}`}
               {:else}
                  {`${localize(`LOCAL.${check.attribute}.label`)} ${check.difficulty}:${check.complexity}`}
               {/if}
            </div>
         </div>

         <!--Resolve Cost-->
         {#if check.resolveCost > 0}
            <div class="tag" transition:slide|local>
               <StatTag label={localize("LOCAL.resolveCost.label")} value={check.resolveCost} />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if check.resistanceCheck !== "none"}
            <div class="stat" transition:slide|local>
               <!--Label-->
               <div class="label">
                  {localize("LOCAL.resistedBy.label")}
               </div>
               <!--Valie-->
               <div class="value">
                  <ResistanceTag resistance={check.resistanceCheck} />
               </div>
            </div>
         {/if}

         <!--Opposed Check-->
         {#if check.opposedCheck.enabled}
            <div class="stat" transition:slide|local>
               <!--Label-->
               <div class="label">
                  {localize("LOCAL.opposedBy.label")}
               </div>

               <!--Value-->
               <div class="value attribute {check.opposedCheck.attribute}">
                  {#if check.opposedCheck.skill !== "none"}
                     {`${localize(`LOCAL.${check.opposedCheck.attribute}.label`)} (${localize(
                        `LOCAL.${check.opposedCheck.skill}.label`
                     )})`}
                  {:else}
                     {localize(`LOCAL.${check.opposedCheck.attribute}.label`)}
                  {/if}
               </div>
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

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
            margin-top: 1rem;
         }

         .check {
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

         .tag {
            font-size: 0.9rem;
            margin-top: 0.5rem;
         }

         .stat {
            @include flex-column;
            @include flex-group-top;
            margin-top: 0.5rem;

            .label {
               font-size: 0.9rem;
               font-weight: bold;
            }

            .value {
               margin-top: 0.25rem;
            }

            .attribute {
               @include border;
               @include attribute-colors;
               padding: 0.25rem;
            }
         }
      }
   }
</style>
