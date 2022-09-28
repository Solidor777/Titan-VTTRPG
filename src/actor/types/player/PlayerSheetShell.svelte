<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";
   import CharacterResourceMeter from "../character/sheet/base/CharacterResourceMeter.svelte";
   import CharacterMod from "../character/sheet/base/CharacterMod.svelte";
   import CharacterRating from "../character/sheet/base/CharacterRating.svelte";
   import CharacterSpeed from "../character/sheet/base/CharacterSpeed.svelte";
   import CharacterAttribute from "../character/sheet/base/CharacterAttribute.svelte";
   import CharacterResistance from "../character/sheet/base/CharacterResistance.svelte";
   import CharacterSkillsTab from "../character/sheet/tabs/CharacterSkillsTab.svelte";
   import CharacterActionsTab from "../character/sheet/tabs/CharacterActionsTab.svelte";
   import CharacterAbilitiesTab from "../character/sheet/tabs/CharacterAbilitiesTab.svelte";
   import CharacterInventoryTab from "../character/sheet/tabs/CharacterInventoryTab.svelte";
   import CharacterSpellsTab from "../character/sheet/tabs/CharacterSpellsTab.svelte";
   import CharacterEffectsTab from "../character/sheet/tabs/CharacterEffectsTab.svelte";

   // Setup context variables
   export let elementRoot;
   export let documentStore;
   export let applicationStateStore;
   setContext("DocumentStore", documentStore);
   setContext("ApplicationStateStore", applicationStateStore);
   const document = getContext("DocumentStore");

   // Tabs
   const tabs = [
      { label: localize("skills"), id: "skills", component: CharacterSkillsTab },
      { label: localize("actions"), id: "actions", component: CharacterActionsTab },
      { label: localize("inventory"), id: "inventory", component: CharacterInventoryTab },
      { label: localize("abilities"), id: "abilities", component: CharacterAbilitiesTab },
      { label: localize("spells"), id: "spells", component: CharacterSpellsTab },
      { label: localize("effects"), id: "effects", component: CharacterEffectsTab },
   ];

   // Application reference
   const appState = getContext("ApplicationStateStore");
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
                  <CharacterResourceMeter
                     bind:value={$document.system.resource[key].value}
                     bind:staticMod={$document.system.resource[key].staticMod}
                     max={$document.system.resource[key].maxValue}
                     label={localize(`${key}`)}
                     editStaticModTooltip={localize(`${key}.editStaticMod`)}
                     editValueTooltip={localize(`${key}.editValue`)}
                     valueTooltip={localize(`${key}.valueDesc`)}
                     maxTooltip={localize(`${key}.max`)}
                  />
               </div>
            {/each}
         </div>

         <!--Ratings-->
         <div class="mods">
            {#each Object.entries($document.system.mod) as [key]}
               <div class="mod">
                  <CharacterMod bind:key />
               </div>
            {/each}
         </div>

         <!--Ratings-->
         <div class="ratings">
            {#each Object.entries($document.system.rating) as [key]}
               <div class="rating">
                  <CharacterRating bind:key />
               </div>
            {/each}
         </div>

         <!--Speeds-->
         <div class="speeds">
            <div class="label">
               <div class="name">{localize("speed")}</div>
               <div class="base">{localize("base")}</div>
               <div class="mod">{localize("mod")}</div>
            </div>
            {#each Object.entries($document.system.speed) as [key]}
               <div class="speed">
                  <CharacterSpeed bind:key />
               </div>
            {/each}
         </div>
      </div>
      <!--Main Sheet-->
      <div class="main">
         <!--Header -->
         <div class="header">
            <!--Name and XP-->
            <div class="row">
               <!--Character name Sheet-->
               <div class="actor-name">
                  <DocumentName />
               </div>

               <!--Exp-->
               <div class="xp">
                  <!--Available-->
                  <div class="available" data-tooltip={localize("xpAvailable")}>
                     {$document.system.xp.available} /
                  </div>

                  <!--Earned Input-->
                  <div class="earned" data-tooltip={localize("xpEarned")}>
                     <DocumentIntegerInput bind:value={$document.system.exp.earned} />
                  </div>

                  <!--Label-->
                  <div class="label">{localize("xp")}</div>
               </div>
            </div>

            <!--Attributes and Resistances-->
            <div class="row">
               <!--Attributes-->
               <div class="attributes">
                  <div class="label">
                     <div class="name">{localize("attribute")}</div>
                     <div class="base">{localize("base")}</div>
                     <div class="mod">{localize("mod")}</div>
                  </div>
                  {#each Object.entries($document.system.attribute) as [key]}
                     <div class="attribute">
                        <CharacterAttribute bind:key />
                     </div>
                  {/each}
               </div>

               <!--Divider-->
               <div class="divider" />

               <!--Resistances-->
               <div class="resistances">
                  <div class="label">
                     <div class="name">{localize("resistance")}</div>
                     <div class="base">{localize("base")}</div>
                     <div class="mod">{localize("mod")}</div>
                  </div>
                  {#each Object.entries($document.system.resistance) as [key]}
                     <div class="resistance">
                        <CharacterResistance bind:key />
                     </div>
                  {/each}
               </div>
            </div>
         </div>
         <!--Tab Content-->
         <div class="tabs">
            <Tabs {tabs} bind:activeTab={$appState.activeTab} />
         </div>
      </div>
   </div>
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
               @include font-size-normal;
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

               .xp {
                  margin-right: 0.5rem;
                  display: flex;
                  width: 10rem;
                  align-items: center;
                  text-align: center;
                  justify-content: flex-end;

                  .available {
                     font-family: var(--font-family);
                     font-weight: bold;
                     @include font-size-normal;
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
                     @include font-size-normal;
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
                     @include font-size-normal;
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
