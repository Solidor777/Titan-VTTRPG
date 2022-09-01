<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import ActorResourceMeter from "~/actor/sheet/ActorResourceMeter.svelte";
   import ActorResistance from "~/actor/sheet/ActorResistance.svelte";
   import ActorRating from "~/actor/sheet/ActorRating.svelte";
   import ActorSpeed from "~/actor/sheet/ActorSpeed.svelte";
   import ActorAttribute from "~/actor/sheet/ActorAttribute.svelte";
   import ActorSkillsTab from "~/actor/sheet/ActorSkillsTab.svelte";
   import ActorInventoryTab from "~/actor/sheet/ActorInventoryTab.svelte";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import ActorActionsTab from "~/actor/sheet/ActorActionsTab.svelte";
   import ActorMod from "~/actor/sheet/ActorMod.svelte";
   import ActorSpellsTab from "~/actor/sheet/ActorSpellsTab.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   // Tabs
   const tabs = [
      { label: localize("LOCAL.skills.label"), id: "skills", component: ActorSkillsTab },
      { label: localize("LOCAL.actions.label"), id: "actions", component: ActorActionsTab },
      { label: localize("LOCAL.inventory.label"), id: "inventory", component: ActorInventoryTab },
      { label: localize("LOCAL.spells.label"), id: "spells", component: ActorSpellsTab },
   ];

   // Application reference
   const application = getContext("external").application;
   application.activeTab = application.activeTab ?? "inventory";
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
            {#each Object.entries($document.system.resource) as [key]}
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

         <!--Ratings-->
         <div class="mods">
            {#each Object.entries($document.system.mod) as [key]}
               <div class="mod">
                  <ActorMod bind:key />
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

         <!--Speeds-->
         <div class="speeds">
            <div class="label">
               <div class="name">{localize("LOCAL.speed.label")}</div>
               <div class="base">{localize("LOCAL.base.label")}</div>
               <div class="mod">{localize("LOCAL.mod.label")}</div>
            </div>
            {#each Object.entries($document.system.speed) as [key]}
               <div class="speed">
                  <ActorSpeed bind:key />
               </div>
            {/each}
         </div>
      </div>
      <!--Main Sheet-->
      <div class="main">
         <!--Header -->
         <div class="header">
            <!--Name and EXP-->
            <div class="row">
               <!--Actor name Sheet-->
               <div class="actor-name">
                  <DocumentName />
               </div>

               <!--Exp-->
               <div class="exp">
                  <!--Available-->
                  <div class="available" data-titan-tooltip={localize("LOCAL.expAvailable.label")}>
                     {$document.system.exp.available} /
                  </div>

                  <!--Earned Input-->
                  <div class="earned" data-titan-tooltip={localize("LOCAL.expEarned.label")}>
                     <DocumentIntegerInput bind:value={$document.system.exp.earned} />
                  </div>

                  <!--Label-->
                  <div class="label">{localize("LOCAL.exp.label")}</div>
               </div>
            </div>

            <!--Attributes and Resistances-->
            <div class="row">
               <!--Attributes-->
               <div class="attributes">
                  <div class="label">
                     <div class="name">{localize("LOCAL.attribute.label")}</div>
                     <div class="base">{localize("LOCAL.base.label")}</div>
                     <div class="mod">{localize("LOCAL.mod.label")}</div>
                  </div>
                  {#each Object.entries($document.system.attribute) as [key]}
                     <div class="attribute">
                        <ActorAttribute bind:key />
                     </div>
                  {/each}
               </div>

               <!--Divider-->
               <div class="divider" />

               <!--Resistances-->
               <div class="resistances">
                  <div class="label">
                     <div class="name">{localize("LOCAL.resistance.label")}</div>
                     <div class="base">{localize("LOCAL.base.label")}</div>
                     <div class="mod">{localize("LOCAL.mod.label")}</div>
                  </div>
                  {#each Object.entries($document.system.resistance) as [key]}
                     <div class="resistance">
                        <ActorResistance bind:key />
                     </div>
                  {/each}
               </div>
            </div>
         </div>
         <!--Tab Content-->
         <div class="tabs">
            <Tabs {tabs} bind:activeTab={application.activeTab} />
         </div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .player-sheet {
      display: flex;
      flex: 1;

      .sidebar {
         @include border;
         @include flex-column;
         @include flex-group-top;

         width: 14rem;
         min-width: 14rem;
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
            @include border-bottom;
            width: 100%;
            padding-bottom: 0.25rem;

            .resource {
               width: 100%;

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               &:not(:last-child) {
                  padding-bottom: 0.25rem;
                  @include border-bottom;
               }

               &.stamina {
                  --meter-color: var(--stamina-color-dark);
               }

               &.wounds {
                  --meter-color: var(--wounds-color-dark);
               }

               &.resolve {
                  --meter-color: var(--resolve-color-dark);
               }
            }
         }

         .mods {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .mod {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .ratings {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .rating {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .speeds {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;

            .label {
               @include flex-row;
               @include flex-group-left;
               font-size: 1rem;
               font-weight: bold;
               width: 100%;

               .name {
                  @include flex-row;
                  text-align: left;
                  width: 5rem;
               }
               .base {
                  margin-left: 0.325rem;
                  width: 2.5rem;
               }

               .mod {
                  width: 2.5rem;
                  margin-left: 0.875rem;
               }
            }

            .speed {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom;
                  padding-bottom: 0.25rem;
               }
            }
         }
      }

      .main {
         display: flex;
         flex: 1;
         @include flex-column;

         .header {
            @include border;
            @include flex-column;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0.5rem;

            .row {
               @include flex-row;
               @include flex-space-between;
               width: 100%;

               &:not(:first-child) {
                  @include border-top;
                  margin-top: 0.5rem;
                  padding-top: 0.5rem;
               }

               .actor-name {
                  width: 50%;
               }

               .exp {
                  margin-right: 0.5rem;
                  display: flex;
                  width: 10rem;
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
                     --input-border-radius: 10px;
                     --input-height: 1.8rem;
                  }

                  .label {
                     font-family: var(--font-family);
                     font-weight: bold;
                  }
               }

               .attributes {
                  @include flex-column;
                  height: 100%;

                  .label {
                     font-size: 1rem;
                     font-weight: bold;
                     @include flex-row;
                     width: 100%;
                     .name {
                        @include flex-row;
                        @include flex-group-center;
                        width: 5.5rem;
                        margin-left: 0.5rem;
                     }
                     .base {
                        margin-left: 0.25rem;
                        width: 2.5rem;
                     }

                     .mod {
                        width: 2.5rem;
                        margin-left: 0.75rem;
                     }
                  }

                  .attribute {
                     height: 100%;
                     &:not(:first-child) {
                        margin-top: 0.25rem;
                     }

                     &:not(:last-child) {
                        @include border-bottom;
                        padding-bottom: 0.25rem;
                     }
                  }
               }

               .resistances {
                  @include flex-column;
                  @include flex-group-top;

                  .label {
                     @include flex-row;
                     font-size: 1rem;
                     font-weight: bold;
                     width: 100%;

                     .name {
                        @include flex-row;
                        @include flex-group-center;
                        width: 5.5rem;
                        margin-left: 0.325rem;
                     }

                     .base {
                        margin-left: 0.25rem;
                        width: 2.5rem;
                     }

                     .mod {
                        width: 2.5rem;
                        margin-left: 0.325rem;
                     }
                  }

                  .resistance {
                     width: 100%;
                     margin-top: 0.25rem;

                     &:not(:last-child) {
                        @include border-bottom;
                        padding-bottom: 0.25rem;
                     }
                  }
               }

               .divider {
                  height: 100%;
                  width: 0;
                  border-left: var(--border-style);
                  border-width: var(--border-width);
               }
            }
         }

         .tabs {
            @include flex-column;
            margin-top: 0.5rem;
            height: 100%;
            width: 100%;
         }
      }
   }
</style>
