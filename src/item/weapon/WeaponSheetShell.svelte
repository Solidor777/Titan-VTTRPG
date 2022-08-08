<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { EditAttackTraitsDialog } from "./EditAttackTraitsDialog.js";
   import HeaderWithSidebar from "~/helpers/svelte-components/HeaderWithSidebar.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import Tabs from "~/helpers/svelte-components/Tabs.svelte";
   import WeaponAttacksTab from "./WeaponAttacksTab.svelte";
   import WeaponDescriptionTab from "./WeaponDescriptionTab.svelte";
   import AttackSheetVertical from "./AttackSheetVertical.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   // Initialize collapsed state
   const application = getContext("external").application;
   const isCollapsed = application.isCollapsed;
   isCollapsed.desc = isCollapsed.desc ?? { attack: [] };
   for (const [key, value] of Object.entries($document.system.attack)) {
      isCollapsed.desc.attack[key] = isCollapsed.desc.attack[key] ?? false;
   }

   // Tabs
   const tabs = [
      { label: localize("LOCAL.description.label"), id: "description", component: WeaponDescriptionTab },
      { label: localize("LOCAL.attacks.label"), id: "attacks", component: WeaponAttacksTab },
   ];
   application.activeTab = application.activeTab ?? "description";

   // Button info for add attack button
   const addAttackButton = {
      icon: "fas fa-circle-plus",
      efx: ripple(),
   };

   // Handles deleting an attack
   async function deleteAttack(key) {
      if (isCollapsed.desc.attack.length === 1) {
         isCollapsed.desc.attack[0] = false;
      } else {
         isCollapsed.desc.attack.splice(key, 1);
      }
      await $document.weapon.deleteAttack(key);
      return;
   }

   // Handles adding an attack
   async function addAttack() {
      await $document.weapon.addAttack();
      return;
   }

   // Opens the attack traits edit dialog
   function editAttackTraits(attackIdx) {
      const dialog = new EditAttackTraitsDialog($document, attackIdx);
      dialog.render(true);
      return;
   }
</script>

<ApplicationShell bind:elementRoot>
   <div class="weapon-sheet">
      <HeaderWithSidebar>
         <!--Sidebar-->
         <div class="sidebar" slot="sidebar">
            <!--Item portrait-->
            <div class="portrait">
               <DocumentImagePicker path={"img"} alt={"item portrait"} />
            </div>

            <!--Attacks-->
            <div class="attacks">
               <!--Attacks Label-->
               <div class="attacks-header">
                  {localize("LOCAL.attacks.label")}
               </div>
               <ScrollingContainer>
                  <!--List of attacks-->
                  <ol class="attack-list">
                     <!--For Each attack-->
                     {#each Object.entries($document.system.attack) as [attackIdx, attack]}
                        <li transition:slide>
                           <AttackSheetVertical
                              deleteAttack={() => {
                                 deleteAttack(attackIdx);
                              }}
                              editAttackTraits={() => {
                                 editAttackTraits(attackIdx);
                              }}
                              {attackIdx}
                              bind:isCollapsedObject={application.isCollapsed.desc.attack}
                           />
                        </li>
                     {/each}
                  </ol>
                  <!--Add attack button-->
                  <div class="add-attack-button">
                     <IconButton button={addAttackButton} on:click={addAttack} />
                  </div>
               </ScrollingContainer>
            </div>
         </div>

         <!--Header-->
         <div class="header" slot="header">
            <div class="row">
               <!--Item name Sheet-->
               <div class="item-name">
                  <DocumentName />
               </div>
            </div>
         </div>
         <!--Tab Content-->
         <div class="tabs" slot="content">
            <Tabs {tabs} bind:activeTab={application.activeTab} />
         </div>
      </HeaderWithSidebar>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .weapon-sheet {
      font-size: 1rem;
      --sidebar-width: 13rem;
      --header-height: 10rem;

      .sidebar {
         @include flex-column;
         @include flex-group-top;
         @include border;
         padding: 0.25rem;
         height: 100%;
         margin-right: 0.5rem;

         .portrait {
            width: 8rem;
            --border-style: none;
         }

         .attacks {
            @include flex-column;
            width: 100%;
            height: 100%;
            margin-top: 0.5rem;

            .attacks-header {
               font-weight: bold;
               margin-bottom: 0.5rem;
            }

            ol {
               list-style: none;
               padding: 0;
               margin: 0;

               li {
                  &:not(:first-child) {
                     margin-top: 0.5rem;
                  }
               }
            }

            .add-attack-button {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
               margin-top: 0.5rem;
            }
         }
      }

      .header {
         @include flex-column;
         @include flex-group-center;
         @include border;
         padding: 0.5rem;
         height: 100%;
         .row {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
         }
      }

      .tabs {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;
         margin-top: 0.5rem;
      }

      .label {
         font-weight: bold;
      }
   }
</style>
