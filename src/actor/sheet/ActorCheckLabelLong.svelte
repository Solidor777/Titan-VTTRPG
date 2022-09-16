<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

   // Reference to the docuement
   const document = getContext("DocumentStore");

   export let check = {
      attribute: "body",
      skill: "athletics",
      difficulty: 4,
      complexity: 0,
   };

   $: secondRow =
      check.skill &&
      check.skill !== "none" &&
      $document.system.skill[check.skill].expertise.value > 0 &&
      $document.system.skill[check.skill].training.value > 0;
</script>

<!--Check label-->
<div class="check-label {check.attribute}">
   <div class="row">
      <!--Skill & Attribute-->
      <div class="skill-attribute">
         {#if check.skill && check.skill !== "none"}
            {`${localize(`${check.attribute}`)} (${localize(`${check.skill}`)})`}
         {:else}
            {localize(`${check.attribute}`)}
         {/if}
      </div>

      <!--DC-->
      <div class="stat label">
         {#if check.complexity}
            {check.difficulty}:{check.complexity}
         {:else}
            {check.difficulty}
         {/if}
      </div>

      {#if !secondRow}
         <!--Pool-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               <i class="fas fa-dice-d6" />
               {localize("dice")}:
            </div>

            <!--Value-->
            <div class="value">
               {$document.system.attribute[check.attribute].value +
                  (check.skill ? $document.system.skill[check.skill].training.value : 0)}
            </div>
         </div>

         <!--Skill stats-->
         {#if check.skill && check.skill !== "none"}
            <!--Expertise-->
            {#if $document.system.skill[check.skill].expertise.value > 0}
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     <i class="fas fa-graduation-cap" />
                     {localize("expertise")}:
                  </div>

                  <!--Value-->
                  <div class="value">
                     {$document.system.skill[check.skill].expertise.value}
                  </div>
               </div>
            {/if}

            <!--Training-->
            {#if $document.system.skill[check.skill].training.value > 0}
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     <i class="fas fa-dumbbell" />
                     {localize("training")}:
                  </div>

                  <!--Value-->
                  <div class="value">
                     {$document.system.skill[check.skill].training.value}
                  </div>
               </div>
            {/if}
         {/if}
      {/if}
   </div>
   {#if secondRow}
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
               {$document.system.attribute[check.attribute].value +
                  (check.skill ? $document.system.skill[check.skill].training.value : 0)}
            </div>
         </div>

         <!--Skill stats-->
         {#if check.skill && check.skill !== "none"}
            <!--Expertise-->
            {#if $document.system.skill[check.skill].expertise.value > 0}
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     <i class="fas fa-graduation-cap" />
                     {localize("expertise")}:
                  </div>

                  <!--Value-->
                  <div class="value">
                     {$document.system.skill[check.skill].expertise.value}
                  </div>
               </div>
            {/if}

            <!--Training-->
            {#if $document.system.skill[check.skill].training.value > 0}
               <div class="stat">
                  <!--Label-->
                  <div class="label">
                     <i class="fas fa-dumbbell" />
                     {localize("training")}:
                  </div>

                  <!--Value-->
                  <div class="value">
                     {$document.system.skill[check.skill].training.value}
                  </div>
               </div>
            {/if}
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .check-label {
      @include flex-column;
      @include flex-group-top;
      @include attribute-colors;
      @include border;
      padding: 0.25rem;

      .row {
         @include flex-row;
         @include flex-group-center;
         flex-wrap: wrap;

         &:not(:first-child) {
            margin-top: 0.25rem;
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
   }
</style>
