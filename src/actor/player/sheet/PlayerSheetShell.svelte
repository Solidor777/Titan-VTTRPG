<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import ActorResourceMeter from "~/actor/sheet/ActorResourceMeter.svelte";
   import ActorResistance from "~/actor/sheet/ActorResistance.svelte";
   import ActorRating from "../../sheet/ActorRating.svelte";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <!--Sheet-->
   <div class="player-sheet">
      <!--Sidebar-->
      <div class="sidebar">
         <!--Character Portrait-->
         <div class="portrait">
            <DocumentImagePicker path={"img"} alt={"character portrait"} />
         </div>

         <!--Resources-->
         <div class="resources">
            <!--Each Resource Meter-->
            {#each Object.entries($document.system.resource) as [key, resource]}
               <div class="resource {key}">
                  <ActorResourceMeter
                     bind:value={$document.system.resource[key].value}
                     bind:staticMod={$document.system.resource[key].staticMod}
                     max={$document.system.resource[key].maxValue}
                     label={localize(`LOCAL.${key}.label`)}
                     editStaticModTooltip={localize(`LOCAL.${key}.editStaticMod.label`)}
                     editValueTooltip={localize(`LOCAL.${key}.editValue.label`)}
                     valueTooltip={localize(`LOCAL.${key}.valueDesc.label`)}
                     maxTooltip={localize(`LOCAL.${key}.max.label`)}
                  />
               </div>
            {/each}
         </div>

         <!--Resistances-->
         <div class="resistances">
            {#each Object.entries($document.system.resistance) as [key]}
               <div class="resistance">
                  <ActorResistance bind:key />
               </div>
            {/each}
         </div>

         <!--Ratings-->
         <div class="ratings">
            {#each Object.entries($document.system.rating) as [key]}
               <div class="rating">
                  <ActorRating bind:key />
               </div>
            {/each}
         </div>
      </div>
      <!--Main Sheet-->
      <div class="main">
         <!--Header -->
         <div class="header">
            <!--Actor name Sheet-->
            <div class="actor-name">
               <DocumentTextInput bind:value={$document.name} />
            </div>

            <!--Exp-->
            <div class="exp">
               <!--Available-->
               <div class="available" data-tooltip={localize("LOCAL.expAvailable.label")}>
                  {$document.system.exp.available} /
               </div>

               <!--Earned Input-->
               <div class="earned" data-tooltip={localize("LOCAL.expEarned.label")}>
                  <DocumentTextInput bind:value={$document.system.exp.earned} type="integer" />
               </div>

               <!--Label-->
               <div class="label">{localize("LOCAL.exp.label")}</div>
            </div>
         </div>
         <!--Tab Content-->
         <div class="tab-content" />
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .player-sheet {
      display: flex;
      flex: 1;

      .sidebar {
         @include border-normal;
         @include flex-column;
         @include flex-group-top;

         width: 13rem;
         min-width: 13rem;
         height: 100%;
         margin-right: 0.5rem;
         padding: 0.5rem;

         .portrait {
            width: 10rem;
            --border-style-normal: none;
         }

         .resources {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            padding-bottom: 0.25rem;

            .resource {
               width: 100%;

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               &:not(:last-child) {
                  padding-bottom: 0.25rem;
                  @include border-bottom-normal;
               }

               &.stamina {
                  --meter-color: var(--color-stamina-dark);
               }

               &.wounds {
                  --meter-color: var(--color-wounds-dark);
               }

               &.resolve {
                  --meter-color: var(--color-resolve-dark);
               }
            }
         }

         .resistances {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .resistance {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom-normal;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .ratings {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .rating {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom-normal;
                  padding-bottom: 0.25rem;
               }
            }
         }
      }

      .main {
         display: flex;
         flex: 1;

         .header {
            @include border-normal;
            @include flex-row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 4rem;
            padding: 0.5rem;

            .actor-name {
               font-family: var(--font-family);
               font-size: 1.6rem;
               width: 50%;
               --height-input: 2.5rem;
               --border-radius-input: 10px;
               --font-size: 1.5rem;
            }

            .exp {
               margin-right: 1rem;
               display: flex;
               width: 7rem;
               align-items: center;
               text-align: center;
               justify-content: flex-end;

               .available {
                  font-family: var(--font-family);
                  font-weight: bold;
                  font-size: 1.1rem;
                  display: flex;
                  margin-right: 0.25rem;
               }

               .earned {
                  font-family: var(--font-family);
                  display: flex;
                  margin-right: 0.5rem;
                  width: 3rem;
                  --border-radius-input: 10px;
                  --height-input: 1.8rem;
               }

               .label {
                  font-family: var(--font-family);
                  font-weight: bold;
               }
            }
         }
      }
   }
</style>
