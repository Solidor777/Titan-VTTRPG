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
            <!--Meter-->
            <div class="resource stamina">
               <ActorResourceMeter
                  bind:value={$document.system.resource.stamina.value}
                  bind:staticMod={$document.system.resource.stamina.staticMod}
                  max={$document.system.resource.stamina.maxValue}
                  valueTooltip={localize("LOCAL.editCurrentStamina")}
                  meterTooltip={localize("LOCAL.staminaRemainingDesc")}
                  maxTooltip={localize("LOCAL.maxStamina")}
                  label={localize("LOCAL.stamina")}
               />
            </div>

            <!--Wounds-->
            <div class="resource wounds">
               <ActorResourceMeter
                  bind:value={$document.system.resource.wounds.value}
                  bind:staticMod={$document.system.resource.wounds.staticMod}
                  max={$document.system.resource.wounds.maxValue}
                  valueTooltip={localize("LOCAL.editCurrentWounds")}
                  meterTooltip={localize("LOCAL.woundsTakenDesc")}
                  maxTooltip={localize("LOCAL.maxWounds")}
                  label={localize("LOCAL.wounds")}
               />
            </div>

            <!--Resolve-->
            <div class="resource resolve">
               <ActorResourceMeter
                  bind:value={$document.system.resource.resolve.value}
                  bind:staticMod={$document.system.resource.resolve.staticMod}
                  max={$document.system.resource.resolve.maxValue}
                  valueTooltip={localize("LOCAL.editCurrentResolve")}
                  meterTooltip={localize("LOCAL.resolveRemainingDesc")}
                  maxTooltip={localize("LOCAL.maxResolve")}
                  label={localize("LOCAL.resolve")}
               />
            </div>
         </div>

         <!--Resistances-->
         <div class="resistances">
            <div class="label">{localize("LOCAL.resistances")}</div>
            <div class="resistance-container">
               <!--Reflexes-->
               <div class="resistance">
                  <div class="label">{localize("LOCAL.reflex")}</div>
               </div>
               <!--Resilience-->
               <div class="resistance">
                  <div class="label">{localize("LOCAL.resilience")}</div>
               </div>
               <!--Reflexes-->
               <div class="willpower">
                  <div class="label">{localize("LOCAL.willpower")}</div>
               </div>
            </div>
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
               <div class="available" data-titan-tooltip={localize("LOCAL.expAvailable")}>
                  {$document.system.exp.available} /
               </div>

               <!--Earned Input-->
               <div class="earned" data-titan-tooltip={localize("LOCAL.expEarned")}>
                  <DocumentTextInput bind:value={$document.system.exp.earned} type="integer" />
               </div>

               <!--Label-->
               <div class="label">{localize("LOCAL.exp")}</div>
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

            .label {
               display: flex;
               font-weight: bold;
               width: 100%;
               border-bottom: var(--border-style);
               border-width: var(--border-width);
            }

            .resistance-container {
               @include grid(3);

               .resistance {
                  .label {
                     font-weight: bold;
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
