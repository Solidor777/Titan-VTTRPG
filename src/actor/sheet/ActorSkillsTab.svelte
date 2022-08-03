<script>
   import { getContext } from "svelte";
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import AttributeSelect from "~/helpers/svelte-components/AttributeSelect.svelte";

   const document = getContext("DocumentSheetObject");

   async function rollSkillCheck(skill) {
      $document.rollAttributeCheck({
         attribute: $document.system.skill[skill].defaultAttribute,
         skill: skill,
      });
   }
</script>

<div class="skill-tab">
   <!--Header-->
   <div class="header">
      <div class="name">
         {localize("LOCAL.skill.label")}
      </div>
   </div>
   <!--Box for relative scrolling-->
   <div class="relative-box">
      <!--Skils-->
      <div class="skills-container">
         <!--Each skill-->
         {#each Object.entries($document.system.skill) as [key, skill]}
            <div class="skill">
               <!--Button and Attribute-->
               <div class="column">
                  <!--Button for rolling the skill-->
                  <div class="skill-button">
                     <button on:click={rollSkillCheck(key)} on:mousedown={preventDefault}>
                        {localize(`LOCAL.${key}.label`)}
                     </button>
                  </div>
                  <!--Default Attribute Select-->
                  <div class="default-attribute">
                     <div class="label">
                        {localize("LOCAL.defaultAttribute.label")}
                     </div>
                     <div class="select">
                        <AttributeSelect bind:value={$document.system.skill[key].defaultAttribute} />
                     </div>
                  </div>
               </div>
               <!--Training and Expertise-->
               <div class="column">
                  <!--Header row for rolling the skill-->
                  <div class="row">
                     <div class="label" />
                     <div class="value">{localize("LOCAL.base.label")}</div>
                     <div class="op" />
                     <div class="value">{localize("LOCAL.mod.label")}</div>
                     <div class="op" />
                     <div class="value" />
                  </div>
                  <!--Training row-->
                  <div class="row">
                     <div class="label">{localize("LOCAL.training.label")}</div>
                     <div class="value">
                        <DocumentTextInput bind:value={$document.system.skill[key].training.baseValue} />
                     </div>
                     <div class="op">+</div>
                     <div class="value">
                        <DocumentTextInput bind:value={$document.system.skill[key].training.staticMod} />
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
                     <div class="label">Expertise</div>
                     <div class="value">
                        <DocumentTextInput bind:value={$document.system.skill[key].expertise.baseValue} />
                     </div>
                     <div class="op">+</div>
                     <div class="value">
                        <DocumentTextInput bind:value={$document.system.skill[key].expertise.staticMod} />
                     </div>
                     <div class="op">=</div>
                     <div class="value">
                        {$document.system.skill[key].expertise.value}
                     </div>
                  </div>
               </div>
            </div>
         {/each}
      </div>
   </div>

   <!--Each skill-->
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .skill-tab {
      @include flex-column;
      width: 100%;
      height: 100%;
      font-size: 1rem;
      padding: 0.5rem;

      .relative-box {
         position: relative;
         width: 100%;
         height: 100%;

         .skills-container {
            @include flex-column;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            overflow-y: scroll;
         }
      }

      .skill {
         @include flex-row;
         width: 100%;
         border-style: var(--border-style-normal);
         border-width: var(--border-width-normal);
         border-color: var(--border-color-normal);
         padding: 0.5rem;

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
               font-weight: bold;

               .label {
                  @include flex-row;
                  @include flex-group-right;
                  height: 100%;
                  width: 5rem;
                  text-align: right;
               }
               .value {
                  @include flex-row;
                  @include flex-group-center;
                  height: 100%;
                  width: 3.2rem;
                  margin-left: 0.5rem;
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

         button {
            @include border-normal;
            width: 10rem;
            font-size: 1rem;
            font-weight: bold;
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
</style>
