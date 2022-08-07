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
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import DocumentAttributeSelect from "~/documents/components/DocumentAttributeSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/DocumentSkillSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentName from "~/documents/components/DocumentName.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   function editAttackTraits(attackIdx) {
      const dialog = new EditAttackTraitsDialog($document, attackIdx);
      dialog.render(true);
      return;
   }

   const editAttackTraitsButton = {
      icon: "fas fa-pen-to-square",
      efx: ripple(),
   };

   const deleteAttackButton = {
      icon: "fas fa-trash",
      efx: ripple(),
   };

   const isCollapsed = {};

   function getExpandIcon(id) {
      if (isCollapsed[id]) {
         return "fas fa-angle-double-down";
      }
      return "fas fa-angle-double-up";
   }

   function collapseElement(id) {
      isCollapsed[id] = true;
   }

   function expandElement(id) {
      isCollapsed[id] = false;
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
                     {#each Object.entries($document.system.attack) as [key, attack]}
                        <li>
                           <!--Attack header-->
                           <div class="attack-header">
                              <div>
                                 {#if isCollapsed[key]}
                                    <IconButton icon="fas fa-angle-double-down" on:click={expandElement(key)} />
                                 {:else}
                                    <IconButton icon="fas fa-angle-double-up" on:click={collapseElement(key)} />
                                 {/if}
                              </div>

                              <div>
                                 <DocumentTextInput bind:value={$document.system.attack[key].name} />
                              </div>
                              <div>
                                 <IconButton
                                    button={deleteAttackButton}
                                    on:click={$document.weapon.deleteAttack(key)}
                                 />
                              </div>
                           </div>

                           {#if !isCollapsed[key]}
                              <div transition:slide>
                                 <!--Attribute select-->
                                 <div class="attack-field">
                                    <div class="label">{localize("LOCAL.attribute.label")};</div>
                                    <DocumentAttributeSelect bind:value={$document.system.attack[key].attribute} />
                                 </div>

                                 <!--Skill select-->
                                 <div class="attack-field">
                                    <div class="label">{localize("LOCAL.skill.label")};</div>
                                    <DocumentSkillSelect bind:value={$document.system.attack[key].skill} />
                                 </div>

                                 <!--Damage-->
                                 <div class="attack-field">
                                    <div class="label">{localize("LOCAL.damage.label")}</div>
                                    <div class="input-row">
                                       <div class="input">
                                          <DocumentIntegerInput value={$document.system.attack[key].damage} />
                                       </div>
                                       <div class="input">
                                          {localize("LOCAL.plusSuccess.label")}
                                          <DocumentCheckboxInput
                                             value={$document.system.attack[key].plusSuccessDamage}
                                          />
                                       </div>
                                    </div>
                                 </div>

                                 <!--Traits-->
                                 <div class="attack-traits">
                                    <!--Header-->
                                    <div class="attack-traits-header">
                                       <div />
                                       <div>
                                          {localize("LOCAL.traits.label")}
                                       </div>
                                       <div>
                                          <IconButton
                                             button={editAttackTraitsButton}
                                             on:click={editAttackTraits(key)}
                                          />
                                       </div>
                                    </div>
                                    <div class="attack-traits-container">
                                       <!--Each trait-->
                                       {#each Object.entries(attack.traits) as [key, trait]}
                                          <div class="attack-trait">
                                             {localize(`LOCAL.${key}.label`)}
                                             {#if typeof trait === "number"}
                                                {trait}
                                             {/if}
                                          </div>
                                       {/each}
                                    </div>
                                 </div>
                              </div>
                           {/if}
                        </li>
                     {/each}
                  </ol>
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
                  @include border;
                  padding: 0.5rem;

                  .attack-header {
                     @include flex-row;
                     @include flex-group-center;

                     :not(:first-child) {
                        margin-left: 0.5rem;
                     }
                  }

                  .attack-field {
                     @include border-top-normal;
                     margin-top: 0.25rem;
                     padding-top: 0.25rem;

                     .label {
                        font-size: 0.9rem;
                        margin-bottom: 0.25rem;
                     }

                     .input {
                        @include flex-row;
                        @include flex-group-center;
                        width: 100%;
                     }

                     .input-row {
                        @include flex-row;
                        @include flex-group-center;
                        width: 100%;
                     }
                  }

                  .attack-traits {
                     @include border-top-normal;
                     margin-top: 0.25rem;
                     padding-top: 0.25rem;

                     .attack-traits-header {
                        @include grid(3);
                        font-weight: bold;
                        font-size: 1rem;

                        div {
                           @include flex-row;
                           @include flex-group-center;
                           height: 100%;
                           width: 100%;
                        }
                     }

                     .attack-traits-container {
                        @include flex-row;
                        @include flex-group-center;
                        flex-wrap: wrap;
                        width: 100%;

                        .attack-trait {
                           @include border;
                           font-weight: bold;
                           margin: 0.25rem;
                           padding: 0.25rem;
                        }
                     }
                  }
               }
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

      .content {
         @include flex-column;
         @include flex-group-top;
         @include border;
         padding: 0.5rem;
         height: 100%;
         margin-top: 0.5rem;
      }

      .label {
         font-weight: bold;
      }
   }
</style>
