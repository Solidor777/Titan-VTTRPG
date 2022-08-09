<script>
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/DocumentAttributeSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/DocumentSkillSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Collapsed object
   export let isCollapsedObject = void 0;

   // Attack idx
   export let attackIdx = void 0;

   const application = getContext("external").application;

   // Document ref
   const document = getContext("DocumentSheetObject");
</script>

{#if $document.system.attack[attackIdx]}
   <div class="attack-sheet">
      <div class="attack-header">
         <div>
            {#if isCollapsedObject[attackIdx]}
               <!--Collapse button-->
               <IconButton
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     isCollapsedObject[attackIdx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-up"
                  on:click={() => {
                     isCollapsedObject[attackIdx] = true;
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

      <!--Collapsible data-->
      {#if !isCollapsedObject[attackIdx]}
         <div transition:slide|local>
            <!--Attribute select-->
            <div class="attack-field">
               <div class="label">{localize("LOCAL.attribute.label")};</div>
               <DocumentAttributeSelect bind:value={$document.system.attack[attackIdx].attribute} />
            </div>

            <!--Skill select-->
            <div class="attack-field">
               <div class="label">{localize("LOCAL.skill.label")};</div>
               <DocumentSkillSelect bind:value={$document.system.attack[attackIdx].skill} />
            </div>

            <!--Damage-->
            <div class="attack-field">
               <div class="label">{localize("LOCAL.damage.label")}</div>
               <div class="input-row">
                  <div class="input">
                     <DocumentIntegerInput bind:value={$document.system.attack[attackIdx].damage} />
                  </div>
                  <div class="input">
                     {localize("LOCAL.plusSuccess.label")}
                     <DocumentCheckboxInput bind:value={$document.system.attack[attackIdx].plusSuccessDamage} />
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
                        icon={"fas fa-pen-to-square"}
                        efx={ripple}
                        on:click={application.editAttackTraits(attackIdx)}
                     />
                  </div>
               </div>
               <div class="attack-traits-container">
                  <!--Each trait-->
                  {#each Object.entries($document.system.attack[attackIdx].traits) as [attackIdx, trait]}
                     <div class="attack-trait">
                        {localize(`LOCAL.${attackIdx}.label`)}
                        {#if typeof trait === "number"}
                           {trait}
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
   @import "../../Styles/Mixins.scss";

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
</style>
