<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";

   // Document reference
   const document = getContext("DocumentStore");

   // Application reference
   const appState = getContext("ApplicationStateStore");
   const application = getContext("external").application;

   // Filtered Skill list
   const skillList = $document.system.skill;
   $: filteredList = Object.entries(skillList).filter(
      ([key]) => localize(`${key}`).toLowerCase().indexOf($appState.filter.skills.toLowerCase()) !== -1
   );
</script>

<div class="skill-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.skills} />

   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.skills}>
         <ol>
            <!--Each skill-->
            {#each filteredList as [key]}
               <li>
                  <!--Button and Attribute-->
                  <div class="column">
                     <!--Button for rolling the skill-->
                     <div class="skill-button" data-tooltip={localize(`${key}.desc`)}>
                        <EfxButton on:click={application.rollSkillCheck.bind(application, key)}>
                           {localize(`${key}`)}<i class="fas fa-dice" />
                        </EfxButton>
                     </div>
                     <!--Default Attribute Select-->
                     <div class="default-attribute">
                        <div class="label">
                           {localize("defaultAttribute")}
                        </div>
                        <div class="select">
                           <DocumentAttributeSelect bind:value={$document.system.skill[key].defaultAttribute} />
                        </div>
                     </div>
                  </div>
                  <!--Training and Expertise-->
                  <div class="column">
                     <!--Header row for rolling the skill-->
                     <div class="row">
                        <div class="label" />
                        <div class="value">{localize("base")}</div>
                        <div class="op" />
                        <div class="value">{localize("mod")}</div>
                        <div class="op" />
                        <div class="value" />
                     </div>
                     <!--Training row-->
                     <div class="row">
                        <div class="label">{localize("training")}</div>
                        <div class="input">
                           <DocumentIntegerInput bind:value={$document.system.skill[key].training.baseValue} />
                        </div>
                        <div class="op">+</div>
                        <div class="input">
                           <DocumentIntegerInput bind:value={$document.system.skill[key].training.mod.static} />
                        </div>
                        <div class="op">=</div>
                        <div class="value">
                           {`${$document.system.skill[key].training.value} (${
                              $document.system.skill[key].training.value +
                              $document.system.attribute[$document.system.skill[key].defaultAttribute].value
                           })`}
                        </div>
                     </div>
                     <!--Expertise Row-->
                     <div class="row">
                        <div class="label">{localize("expertise")}</div>
                        <div class="input">
                           <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.baseValue} />
                        </div>
                        <div class="op">+</div>
                        <div class="input">
                           <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.mod.static} />
                        </div>
                        <div class="op">=</div>
                        <div class="value">
                           {$document.system.skill[key].expertise.value}
                        </div>
                     </div>
                  </div>
               </li>
            {/each}
         </ol>
      </ScrollingContainer>
   </div>

   <!--Each skill-->
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .skill-tab {
      @include flex-column;
      @include flex-group-center;
      position: relative;
      width: 100%;
      height: 100%;
      @include font-size-normal;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            list-style: none;
            width: 100%;
            padding: 0.25rem;
            margin: 0;

            li {
               @include flex-row;
               @include border;
               @include z-index-app;
               background: var(--label-background-color);
               width: 100%;
               padding: 0.5rem;

               &:not(:first-child) {
                  margin-top: 0.5rem;
               }

               .column {
                  @include flex-column;
                  height: 100%;
                  &:not(:first-child) {
                     margin-left: 0.5rem;
                  }

                  .row {
                     @include flex-row;
                     @include flex-group-center;
                     &:not(:first-child) {
                        margin-top: 0.5rem;
                     }
                     width: 100%;

                     .label {
                        @include flex-row;
                        @include flex-group-right;
                        height: 100%;
                        width: 5rem;
                        font-weight: bold;
                        text-align: right;
                     }
                     .input {
                        @include flex-row;
                        @include flex-group-center;
                        height: 100%;
                        width: 2.5rem;
                        margin-left: 0.5rem;
                        font-weight: bold;
                     }
                     .value {
                        @include flex-row;
                        @include flex-group-center;
                        height: 100%;
                        width: 3.2rem;
                        margin-left: 0.5rem;
                        font-weight: bold;
                     }
                     .op {
                        @include flex-row;
                        @include flex-group-center;
                        height: 100%;
                        width: 0.5rem;
                        margin-left: 0.5rem;
                     }
                  }
               }

               .skill-button {
                  width: 11rem;
                  i {
                     margin-left: 0.25rem;
                  }
               }
               .default-attribute {
                  @include flex-row;
                  @include flex-group-center;
                  height: 100%;
                  width: 100%;

                  .label {
                     @include flex-row;
                     @include flex-group-center;
                     height: 100%;
                     width: 100%;
                     font-weight: bold;
                  }

                  .select {
                     @include flex-row;
                     @include flex-group-center;
                     margin-left: 0.25rem;
                     height: 100%;
                     width: 100%;
                  }
               }
            }
         }
      }
   }
</style>
