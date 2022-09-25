<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

   export let attack = void 0;

   // Reference to the docuement
   const document = getContext("DocumentStore");
</script>

<!--Check label-->
<div class="check-label {attack.attribute}">
   <div class="row">
      <!--Skill & Attribute-->
      <div class="skill-attribute">
         {`${localize(`${attack.attribute}`)} (${localize(`${attack.skill}`)})`}
      </div>

      <div class="stat">
         <div class="label">
            <i class="fas fa-bolt" />
            {localize("damage")}
         </div>
         <div class="value">
            {`${attack.damage + $document.system.mod.damage.value}${
               attack.plusExtraSuccessDamage === true ? localize("plusExtraSucces.short") : ""
            } `}
         </div>
      </div>

      <div class="stat">
         <div class="label">
            <i class="fas fa-ruler" />
            {localize("range")}:
         </div>
         <div class="value">
            {attack.range}
         </div>
      </div>
   </div>

   <div class="row">
      <!--Pool-->
      <div class="stat">
         <!--Label-->
         <div class="label">
            <i class="fas fa-dice-d6" />
            {localize("dice")}:
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
                  {localize("expertise")}:
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
                  {localize("training")}:
               </div>

               <!--Value-->
               <div class="value">
                  {$document.system.skill[attack.skill].training.value}
               </div>
            </div>
         {/if}
      {/if}
   </div>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .check-label {
      @include flex-column;
      @include flex-group-center;
      @include attribute-colors;
      @include border;
      padding: 0.25rem;
      width: 100%;

      .row {
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            margin-top: 0.25rem;
         }
      }

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
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            @include border-left;
            margin-left: 0.25rem;
            padding-left: 0.25rem;
         }

         .label {
            margin-right: 0.25rem;

            i {
               margin-right: 0.25rem;
            }
         }
      }
   }
</style>
