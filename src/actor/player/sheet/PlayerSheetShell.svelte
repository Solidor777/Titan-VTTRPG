<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "../../../documents/components/DocumentTextInput.svelte";
   import DocumentImagePicker from "../../../documents/components/DocumentImagePicker.svelte";
   import ActorResourceMeter from "../../sheet/ActorResourceMeter.svelte";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <!--Sheet-->
   <form class="player-sheet">
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
            <!--Reflexes-->
            {#each Object.entries($document.system.resistance) as [key, resistance]}
               <div class="resistance" data-resistance={key}>
                  <div class="label">{localize(`LOCAL.${key}.label`)}</div>
                  <div class="stats">
                     <div class="label">
                        {resistance.baseValue}
                     </div>
                     <div class="label">+</div>
                     <div class="static-mod">
                        <DocumentTextInput bind:value={$document.system.resistance[key].staticMod} type="integer" />
                     </div>
                     <div class="label">=</div>
                     <div class="label">
                        {resistance.value}
                     </div>
                  </div>
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
   </form>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .player-sheet {
      display: flex;
      flex: 1;

      .sidebar {
         @include border;
         @include flex-column;
         @include flex-group-top;

         width: 13rem;
         min-width: 13rem;
         height: 100%;
         margin-right: 0.5rem;
         padding: 0.5rem;

         .portrait {
            width: 10rem;
            --border-style: none;
         }

         .resources {
            @include flex-column;
            @include flex-group-top;

            width: 100%;

            .resource {
               display: flex;
               justify-content: center;
               text-align: center;
               flex-direction: column;
               width: 100%;
               padding-bottom: 0.25rem;
               border-bottom: var(--border-style);
               border-width: var(--border-width);

               &:not(:first-child) {
                  padding-top: 0.25rem;
               }

               &.stamina {
                  --meter-color: #006f37;
               }

               &.wounds {
                  --meter-color: #a80000;
               }

               &.resolve {
                  --meter-color: #0096c7;
               }
            }
         }

         .resistances {
            @include flex-column;
            margin-top: 0.5rem;
            width: 100%;

            .resistance {
               @include flex-row;
               align-items: center;
               justify-content: space-between;

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               .label {
                  font-weight: bold;
               }

               .stats {
                  @include flex-row;
                  align-items: center;

                  :not(:first-child) {
                     margin-left: 0.25rem;
                  }

                  .static-mod {
                     width: 1.5rem;
                     --border-radius: 50%;
                  }
               }
            }
         }
      }

      .main {
         display: flex;
         flex: 1;

         .header {
            @include border;
            @include flex-row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 4rem;
            padding: 0.5rem;

            .actor-name {
               font-family: var(--font-family);
               font-size: 1.6rem;
               height: 2rem;
               width: 50%;
            }

            .exp {
               margin-right: 1rem;
               display: flex;
               width: 6rem;
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
                  width: 2rem;
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
