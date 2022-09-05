<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";

   export let attack = void 0;

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");
</script>

<!--Check label-->
<div class="check-label {attack.attribute}">
   <!--Skill & Attribute-->
   <div class="skill-attribute">
      {`${localize(`LOCAL.${attack.attribute}.label`)} (${localize(`LOCAL.${attack.skill}.label`)})`}
   </div>

   <!--Pool-->
   <div class="stat">
      <!--Label-->
      <div class="label">
         <i class="fas fa-dice-d6" />
         {localize("LOCAL.dice.label")}:
      </div>

      <!--Value-->
      <div class="value">
         {$document.system.attribute[attack.attribute].value +
            (attack.skill ? $document.system.skill[attack.skill].training.value : 0)}
      </div>
   </div>

   <!--Skill stats-->
   {#if attack.skill}
      <!--Expertise-->
      {#if $document.system.skill[attack.skill].expertise.value && $document.system.skill[attack.skill].expertise.value > 0}
         <div class="stat">
            <!--Label-->
            <div class="label">
               <i class="fas fa-graduation-cap" />
               {localize("LOCAL.expertise.label")}:
            </div>

            <!--Value-->
            <div class="value">
               {$document.system.skill[attack.skill].expertise.value}
            </div>
         </div>
      {/if}

      <!--Training-->
      {#if $document.system.skill[attack.skill].training.value > 0}
         <div class="stat">
            <!--Label-->
            <div class="label">
               <i class="fas fa-dumbbell" />
               {localize("LOCAL.training.label")}:
            </div>

            <!--Value-->
            <div class="value">
               {$document.system.skill[attack.skill].training.value}
            </div>
         </div>
      {/if}
   {/if}
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .check-label {
      @include flex-row;
      @include flex-group-center;
      @include attribute-colors;
      @include border;
      padding: 0.25rem;
      flex-wrap: wrap;

      .skill-attribute {
         @include flex-row;
         @include flex-group-center;
         font-weight: bold;
      }

      .label {
         @include flex-row;
         @include flex-group-center;
         margin-right: 0.25rem;
         font-weight: bold;
      }

      .stat {
         @include border-left;
         @include flex-row;
         @include flex-group-center;
         margin-left: 0.25rem;
         padding-left: 0.25rem;

         .label {
            margin-right: 0.25rem;

            i {
               margin-right: 0.25rem;
            }
         }
      }
   }
</style>
