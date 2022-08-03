<script>
   import { getContext } from "svelte";
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import AttributeSelect from "~/helpers/svelte-components/AttributeSelect.svelte";
   import ActorAttribute from "./ActorAttribute.svelte";

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
               <button on:click={rollSkillCheck(key)} on:mousedown={preventDefault}>
                  {localize(`LOCAL.${key}.label`)}
               </button>
               <div class="text">
                  <DocumentTextInput type="integer" bind:value={$document.system.skill[key].training.baseValue} />
               </div>
               <div class="text">
                  <DocumentTextInput type="integer" bind:value={$document.system.skill[key].training.staticMod} />
               </div>
               <div class="text">
                  <DocumentTextInput type="integer" bind:value={$document.system.skill[key].expertise.baseValue} />
               </div>
               <div class="text">
                  <DocumentTextInput type="integer" bind:value={$document.system.skill[key].expertise.staticMod} />
               </div>
               <div class="select">
                  <AttributeSelect bind:value={$document.system.skill[key].defaultAttribute} />
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
         @include flex-space-evenly;
         padding: 0.25rem;
         width: 100%;
         height: 100%;
         border-style: var(--border-style-normal);
         border-width: var(--border-width-normal);
         border-color: var(--border-color-normal);

         button {
            @include border-normal;
            @include flex-row;
            @include flex-group-center;
            font-size: 1rem;
            font-weight: bold;
            width: 10rem;
         }

         .text {
            @include flex-row;
            @include flex-group-center;
            width: 1.8rem;
         }
      }
   }
</style>
