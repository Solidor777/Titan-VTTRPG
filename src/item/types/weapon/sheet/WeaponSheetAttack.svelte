<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import DocumentTextInput from "~/documents/components/input/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/select/DocumentSkillSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/input/DocumentCheckboxInput.svelte";
   import DocumentRangeTypeSelect from "~/documents/components/select/DocumentRangeTypeSelect.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Collapsed object
   export let isExpandedObject = void 0;

   // Attack idx
   export let attackIdx = void 0;

   const application = getContext("external").application;

   // Document ref
   const document = getContext("DocumentStore");
</script>

{#if $document.system.attack[attackIdx]}
   <div class="attack-sheet">
      <div class="attack-header">
         <div>
            {#if isExpandedObject[attackIdx]}
               <!--Collapse button-->
               <IconButton
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     isExpandedObject[attackIdx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-up"
                  on:click={() => {
                     isExpandedObject[attackIdx] = true;
                  }}
               />
            {/if}
         </div>
         <div>
            <!--Attack Name-->
            <DocumentTextInput bind:value={$document.system.attack[attackIdx].name} />
         </div>
         <div>
            <!--Delete button-->
            <IconButton
               icon={"fas fa-trash"}
               efx={ripple}
               on:click={application.deleteAttack.bind(application, attackIdx)}
            />
         </div>
      </div>

      <!--Expandable data-->
      {#if isExpandedObject[attackIdx]}
         <div transition:slide|local>
            <!--Type-->
            <div class="attack-field">
               <div class="label">{localize("type")}</div>
               <DocumentRangeTypeSelect bind:value={$document.system.attack[attackIdx].type} />
            </div>

            <!--Range-->
            <div class="attack-field">
               <div class="label">{localize("range")}</div>
               <div class="input">
                  <DocumentIntegerInput bind:value={$document.system.attack[attackIdx].range} />
               </div>
            </div>

            <!--Damage-->
            <div class="attack-field">
               <div class="label">{localize("damage")}</div>
               <div class="input-row">
                  <div class="input">
                     <DocumentIntegerInput bind:value={$document.system.attack[attackIdx].damage} />
                  </div>
                  <div class="input">
                     {localize("plusSuccess")}
                     <DocumentCheckboxInput bind:value={$document.system.attack[attackIdx].plusSuccessDamage} />
                  </div>
               </div>
            </div>

            <!--Attribute select-->
            <div class="attack-field">
               <div class="label">{localize("attribute")};</div>
               <DocumentAttributeSelect bind:value={$document.system.attack[attackIdx].attribute} />
            </div>

            <!--Skill select-->
            <div class="attack-field">
               <div class="label">{localize("skill")}</div>
               <DocumentSkillSelect bind:value={$document.system.attack[attackIdx].skill} />
            </div>

            <!--Traits-->
            <div class="attack-traits">
               <!--Header-->
               <div class="attack-traits-header">
                  <div />
                  <div>
                     {localize("traits")}
                  </div>
                  <div>
                     <IconButton
                        icon={"fas fa-pen-to-square"}
                        efx={ripple}
                        on:click={application.editAttackTraits(attackIdx)}
                     />
                  </div>
               </div>
               <div class="attack-traits-container">
                  <!--Each trait-->
                  {#each $document.system.attack[attackIdx].traits as trait}
                     <div class="attack-trait">
                        {localize(`${trait.name}`)}
                        {#if trait.type === "number"}
                           {trait.value}
                        {/if}
                     </div>
                  {/each}
               </div>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .attack-sheet {
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
         @include border-top;
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
         @include border-top;
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
</style>
