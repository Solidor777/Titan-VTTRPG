<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   const document = getContext("DocumentSheetObject");
</script>

<div class="skill-tab">
   <div class="skill header">
      <div class="name">
         {localize("LOCAL.skill.label")}
      </div>
   </div>
   <!--Each skill-->
   {#each Object.entries($document.system.skill) as [key, skill]}
      <div class="skill">
         <div class="name">
            {localize(`LOCAL.${key}.label`)}
         </div>
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .skill-tab {
      flex-grow: 1;
      overflow: auto;
      max-height: 100%;
      font-size: 1rem;
      padding: 0.5rem;

      .skill {
         @include flex-row;
         @include flex-group-left;
         @include border-normal;
         padding: 0.25rem;
         width: 100%;
      }
   }
</style>
