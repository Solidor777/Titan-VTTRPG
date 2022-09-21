<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import DocumentTextInput from "~/documents/components/input/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/select/DocumentSkillSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/input/DocumentCheckboxInput.svelte";
   import DocumentRangeTypeSelect from "~/documents/components/select/DocumentRangeTypeSelect.svelte";

   // Attack idx
   export let idx = void 0;

   // Setup context variables
   const application = getContext("external").application;
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   $: attack = $document.system.attack[idx];
   $: isExpanded = $appState.isExpanded.attacks[idx];
</script>

{#if attack}
   <div class="attack">
      <!--Header-->
      <div class="header">
         <!--Expand Toggle-->
         <div class="expand-button">
            {#if isExpanded}
               <!--Collapse button-->
               <IconButton
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     $appState.isExpanded.attacks[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-right"
                  on:click={() => {
                     $appState.isExpanded.attacks[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={attack.label} />
         </div>

         <!--Delete button-->
         <div class="delete-button">
            <!--Delete button-->
            <IconButton
               icon={"fas fa-trash"}
               on:click={() => {
                  application.removeAttack(idx);
               }}
            />
         </div>
      </div>

      <!--Expandable Content-->
      {#if isExpanded}
         <div class="expandable-content" transition:slide|local>
            <div class="row">
               <!--Type-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("type")}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentRangeTypeSelect bind:value={attack.type} />
                  </div>
               </div>

               <!--Range-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("range")}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={attack.range} min={1} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("damage")}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={attack.damage} min={0} />
                  </div>

                  <!--Plus Success Damage-->
                  <div class="input">
                     {localize("plusSuccess")}
                     <DocumentCheckboxInput bind:value={attack.plusSuccessDamage} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Attribute select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("attribute")};</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentAttributeSelect bind:value={attack.attribute} />
                  </div>
               </div>

               <!--Skill select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize("skill")}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentSkillSelect bind:value={attack.skill} />
                  </div>
               </div>
            </div>

            <!--Traits-->
            <div class="traits">
               <!--Header-->
               <div class="traits-header">
                  <!--Label-->
                  <div class="label">
                     {localize("traits")}
                  </div>

                  <!--Edit Button-->
                  <div class="edit-traits-button">
                     <IconButton icon={"fas fa-pen-to-square"} on:click={application.editAttackTraits(idx)} />
                  </div>
               </div>
               {#if attack.trait.length > 0}
                  <div class="traits-container">
                     <!--Each trait-->
                     {#each attack.trait as trait (trait.name)}
                        <div class="trait" data-tooltip={localize(`${trait.name}.desc`)}>
                           {#if trait.type === "number"}
                              <!--Number Trait-->
                              <StatTag label={localize(trait.name)} value={trait.value} />
                           {:else}
                              <!--Bool Trait-->
                              <Tag label={localize(trait.name)} />
                           {/if}
                        </div>
                     {/each}
                  </div>
               {/if}
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .attack {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;
         padding: 0.25rem;
         width: 100%;
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         width: calc(100% - 2rem);
         padding: 0.25rem;
         font-size: 0.9rem;

         .row {
            @include flex-row;
            @include flex-group-center;
            padding-top: 0.5rem;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.5rem;
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: 0.5rem;
                  padding-left: 0.5rem;
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  font-weight: bold;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;
                  box-sizing: content-box;
                  margin-left: 0.5rem;
                  font-size: 1rem;

                  &.number {
                     width: 2rem;
                  }
               }
            }
         }

         .traits {
            @include border-top;
            width: 100%;
            margin-top: 0.25rem;
            padding-top: 0.25rem;

            .traits-header {
               @include flex-row;
               @include flex-group-center;

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  font-weight: bold;
                  font-size: 1rem;
               }

               .edit-traits-button {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.5rem;
               }
            }

            .traits-container {
               @include flex-row;
               @include flex-group-center;
               flex-wrap: wrap;
               width: 100%;
               margin-bottom: 00.25rem;

               .trait {
                  margin: 0.5rem 0.25rem 0 0.25rem;
               }
            }
         }
      }
   }
</style>
