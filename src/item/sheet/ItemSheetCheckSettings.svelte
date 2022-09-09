<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/DocumentAttributeSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/DocumentSkillSelect.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application reference
   const application = getContext("external").application;

   // Idx of the Check
   export let idx = void 0;

   // Resistance options
   const resistanceSelectOptions = [
      {
         label: localize("LOCAL.reflexes.label"),
         value: "reflexes",
      },
      {
         label: localize("LOCAL.resilience.label"),
         value: "resilience",
      },
      {
         label: localize("LOCAL.willpower.label"),
         value: "willpower",
      },
      {
         label: localize("LOCAL.none.label"),
         value: "none",
      },
   ];
</script>

{#if $document.system.check[idx]}
   <div class="check" out:slide>
      <!--Header-->
      <div class="check-header">
         <!--Expand button-->
         <div>
            {#if application.isExpanded.checks[idx]}
               <IconButton
                  icon={"fas fa-angles-down"}
                  on:click={() => {
                     application.isExpanded.checks[idx] = false;
                  }}
               />
            {:else}
               <IconButton
                  icon={"fas fa-angles-right"}
                  on:click={() => {
                     application.isExpanded.checks[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label-input">
            <DocumentTextInput bind:value={$document.system.check[idx].label} />
         </div>

         <!--Delete button-->
         <div>
            <IconButton
               icon={"fas fa-trash"}
               on:click={async () => {
                  await application.removeCheck(idx);
               }}
            />
         </div>
      </div>

      {#if application.isExpanded.checks[idx]}
         <div class="content" in:slide|local>
            <div class="row">
               <!--Attribute Select-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.attribute.label")}:
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentAttributeSelect bind:value={$document.system.check[idx].attribute} />
                  </div>
               </div>

               <!--Skill Select-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.skill.label")}:
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentSkillSelect bind:value={$document.system.check[idx].skill} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Resistance Check-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.resistanceCheck.label")}:
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentResistanceSelect
                        bind:value={$document.system.check[idx].resistanceCheck}
                        options={resistanceSelectOptions}
                     />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.damage.label")}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={$document.system.check[idx].isDamage} />
                  </div>
               </div>

               <!--Healing-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.healing.label")}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={$document.system.check[idx].isHealing} />
                  </div>
               </div>
            </div>

            <!--Initial value-->
            {#if $document.system.check[idx].isDamage || $document.system.check[idx].isHealing}
               <div class="row" transition:slide|local>
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.initialValue.label")}:
                     </div>

                     <!--Value-->
                     <div class="input number">
                        <DocumentIntegerInput bind:value={$document.system.check[idx].initialValue} min={0} />
                     </div>
                  </div>

                  <!--Scaling-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.scaling.label")}
                     </div>

                     <!--Value-->
                     <div class="input checkbox">
                        <DocumentCheckboxInput bind:value={$document.system.check[idx].scaling} />
                     </div>
                  </div>
               </div>
            {/if}

            <div class="row">
               <!--Opposed Check-->
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     {localize("LOCAL.opposedCheck.label")}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={$document.system.check[idx].opposedCheck.enabled} />
                  </div>
               </div>
            </div>

            {#if $document.system.check[idx].opposedCheck.enabled}
               <div class="row" transition:slide|local>
                  <!--Attribute Select-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.attribute.label")}:
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentAttributeSelect bind:value={$document.system.check[idx].opposedCheck.attribute} />
                     </div>
                  </div>

                  <!--Skill Select-->
                  <div class="stat">
                     <!--Label-->
                     <div class="label">
                        {localize("LOCAL.skill.label")}:
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentSkillSelect bind:value={$document.system.check[idx].opposedCheck.skill} />
                     </div>
                  </div>
               </div>
            {/if}
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .check {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      font-size: 1rem;

      .check-header {
         @include flex-row;
         @include flex-space-between;
         box-sizing: border-box;
         width: 100%;
         font-weight: bold;
         padding: 0.5rem;

         .label-input {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            --input-height: 100%;
         }
      }

      .content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         background: var(--label-background-color);

         .row {
            @include flex-row;
            @include flex-group-center;
            @include border-top;
            width: 100%;
            padding: 0.5rem 0.5rem 0 0.5rem;
            font-size: 0.9rem;
            --font-size: 0.9rem;
            height: 2rem;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            &:last-child {
               margin-bottom: 0.5rem;
            }

            .stat {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;
                  height: 100%;
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

                  &.checkbox {
                     margin-left: 0.25rem;
                  }

                  &:not(.checkbox) {
                     margin-left: 0.5rem;
                  }

                  &.number {
                     width: 3rem;
                  }
               }
            }
         }
      }

      &:not(:first-child) {
         margin-top: 0.25rem;
      }
   }
</style>
