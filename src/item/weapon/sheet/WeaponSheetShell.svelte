<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import HeaderWithSidebar from "~/helpers/svelte-components/HeaderWithSidebar.svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import AttributeSelect from "~/helpers/svelte-components/AttributeSelect.svelte";
   import SkillSelect from "~/helpers/svelte-components/SkillSelect.svelte";
   import DocumentCheckboxInput from "../../../documents/components/DocumentCheckboxInput.svelte";
   import { TJSIconButton } from "@typhonjs-fvtt/svelte-standard/component";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Setup
   export let elementRoot;
   export let documentStore;
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

   const addTraitsButton = {
      icon: "fas fa-circle-plus",
      efx: ripple(),
      title: "LOCAL.addTraits.label",
   };

   const testButton = {
      icon: "fas fa-circle-plus",
      efx: ripple(),
      title: "LOCAL.addTraits.label",
   };
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
               <ScrollingContainer>
                  <!--Attacks Label-->
                  <div class="label">
                     {localize("LOCAL.attacks.label")}
                  </div>

                  <!--List of attacks-->
                  <ol class="attack-list">
                     <!--For Each attack-->
                     {#each Object.entries($document.system.attack) as [key, attack]}
                        <li>
                           <!--Attack header-->
                           <div class="attack-header">
                              <DocumentTextInput bind:value={$document.system.attack[key].name} />
                           </div>

                           <!--Attribute select-->
                           <div class="attack-field">
                              <div class="label">{localize("LOCAL.attribute.label")};</div>
                              <AttributeSelect value={$document.system.attack[key].attribute} />
                           </div>

                           <!--Skill select-->
                           <div class="attack-field">
                              <div class="label">{localize("LOCAL.skill.label")};</div>
                              <SkillSelect value={$document.system.attack[key].skill} />
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
                                    <DocumentCheckboxInput value={$document.system.attack[key].plusSuccessDamage} />
                                 </div>
                              </div>
                           </div>

                           <!--Traits-->
                           <div class="attack-traits">
                              <div class="label">
                                 {localize("LOCAL.traits.label")}
                                 <TJSIconButton button={addTraitsButton} />
                              </div>
                              <div class="traits-container">
                                 {#each Object.entries(attack.traits) as trait}
                                    {localize(`LOCAL.${trait.label}`)}
                                 {/each}
                              </div>
                           </div>
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
                  <DocumentTextInput bind:value={$document.name} />
               </div>
            </div>
         </div>
         <div class="content" slot="content"><EfxButton button={testButton} /></div>
      </HeaderWithSidebar>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .weapon-sheet {
      font-size: 1rem;
      --sidebar-width: 13rem;
      --header-height: 10rem;

      .sidebar {
         @include flex-column;
         @include flex-group-top;
         @include border-normal;
         padding: 0.25rem;
         height: 100%;
         margin-right: 0.5rem;

         .portrait {
            width: 8rem;
            --border-style-normal: none;
         }

         .attacks {
            @include flex-column;
            width: 100%;
            height: 100%;

            ol {
               list-style: none;
               padding: 0;
               margin: 0.5rem 0 0 0;

               li {
                  @include border-normal;
                  padding: 0.5rem;

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
                  }
               }
            }
         }
      }

      .header {
         @include flex-column;
         @include flex-group-center;
         @include border-normal;
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
         @include border-normal;
         padding: 0.5rem;
         height: 100%;
         margin-top: 0.5rem;
      }

      .label {
         font-weight: bold;
      }
   }
</style>
