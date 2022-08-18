<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon id
   export let item = void 0;
</script>

<!--Attacks list-->
<ol>
   <!--Each Attack-->
   {#each Object.entries(item.system.attack) as [attackIdx, attack]}
      <li>
         <div class="row header">
            <!--Attack Button-->
            <div class="attack-button">
               <EfxButton efx={ripple} on:click={application.rollAttackCheck(item._id, attackIdx)}>
                  <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
                  {attack.name}
               </EfxButton>
            </div>
         </div>

         <div class="row stats">
            <!--Dice Pool-->
            <div class="stat">
               <div class="label">
                  <i class="fas fa-dice-d6" />
                  {localize("LOCAL.dice.label")}:
               </div>
               <div class="value">
                  {$document.system.attribute[attack.attribute].value +
                     $document.system.skill[attack.skill].training.value}
               </div>
            </div>

            <!--Expertise-->
            <div class="stat">
               <div class="label">
                  <i class="fas fa-graduation-cap" />
                  {localize("LOCAL.expertise.label")}:
               </div>
               <div class="value">
                  {$document.system.skill[attack.skill].expertise.value}
               </div>
            </div>

            <!--Range-->
            <div class="stat">
               <div class="label">
                  <i class="fas fa-ruler" />
                  {localize("LOCAL.range.label")}:
               </div>
               <div class="value">
                  {attack.range}
               </div>
            </div>

            <!--Damage-->
            <div class="stat">
               <div class="label">
                  <i class="fas fa-bolt" />
                  {localize("LOCAL.damage.label")}
               </div>
               <div class="value">
                  {`${attack.damage + $document.system.mod.damage.value}${
                     attack.plusSuccessDamage === true ? localize("LOCAL.plusSuccess.label") : ""
                  } `}
               </div>
            </div>
         </div>

         <!--Traits-->
         <div class="row traits">
            {#each attack.traits as trait}
               <div class="trait">
                  {localize(`LOCAL.${trait.name}.label`)}
                  {#if typeof trait === "number"}
                     : {trait}
                  {/if}
               </div>
            {/each}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   ol {
      @include flex-row;
      @include flex-group-left;
      margin: 0;
      padding: 0;
      list-style: none;
      flex-wrap: wrap;

      li {
         @include flex-column;
         @include flex-group-center;
         @include border;
         width: 100%;
         padding: 0.25rem;
         background-color: var(--label-background-color);

         .row {
            @include flex-row;
            width: 100%;

            &.header {
               @include flex-group-center;
            }

            &.stats {
               @include flex-space-between;
            }

            &.traits {
               @include flex-group-left;
            }

            &:not(:first-child) {
               margin-top: 0.25rem;
            }

            .stat {
               @include flex-row;
               @include flex-group-center;
               @include border;
               margin: 0.25rem;
               padding: 0.25rem;

               .label {
                  font-weight: bold;
               }

               .value {
                  margin-left: 0.25rem;
               }
            }

            .trait {
               @include flex-row;
               @include flex-group-center;
               @include border;
               margin: 0.25rem;
               padding: 0.25rem;
               font-weight: bold;
            }
         }
      }
   }
</style>
