<script>
   import { getContext } from "svelte";
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

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
   <div class="skill header">
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
         @include flex-group-left;
         padding: 0.25rem;
         width: 100%;
         border-style: var(--border-style-normal);
         border-width: var(--border-width-normal);
         border-color: var(--border-color-normal);

         button {
            @include border-normal;
            font-size: 1rem;
            font-weight: bold;
            width: 10rem;
         }
      }
   }
</style>
