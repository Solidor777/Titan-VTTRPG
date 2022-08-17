<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import ActorItemExpandButton from "./ActorItemExpandButton.svelte";
   import ActorItemSendToChatButton from "./ActorItemSendToChatButton.svelte";
   import ActorItemEditButton from "./ActorItemEditButton.svelte";
   import ActorItemDeleteButton from "./ActorItemDeleteButton.svelte";
   import ActorItemDescription from "./ActorItemDescription.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

   // Weapon list
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="actor-inventory-weapon-sheet">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <ActorItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Send to Chat button-->
            <div class="item-control-button">
               <ActorItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="item-control-button">
               <ActorItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <ActorItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="item-expandable-content" transition:slide|local>
            <div class="multi-attack">
               <!--Multi attack` -->
               <div>
                  <EfxButton efx={ripple} on:click={application.toggleMultiAttack.bind(application, item._id)}>
                     {localize("LOCAL.multiAttack.label")}:
                     <i class={item.system.multiAttack ? "fas fa-square-check" : "fas fa-square"} />
                  </EfxButton>
               </div>
            </div>

            <!--Item Description-->
            <div class="attack-description">
               <ActorItemDescription description={"Temporary Attack Description"} />
            </div>

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
                              {`${attack.damage}${
                                 attack.plusSuccessDamage === true ? localize("LOCAL.plusSuccess.label") : ""
                              } `}
                           </div>
                        </div>
                     </div>

                     <!--Traits-->
                     <div class="row traits">
                        {#each Object.entries(attack.traits) as [key, trait]}
                           <div class="trait">
                              {localize(`LOCAL.${key}.label`)}
                              {#if typeof trait === "number"}
                                 : {trait}
                              {/if}
                           </div>
                        {/each}
                     </div>
                  </li>
               {/each}
            </ol>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .actor-inventory-weapon-sheet {
      @include flex-column;
      width: 100%;

      .item-header {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;

         .item-controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .item-control-button {
               &:not(:first-child) {
                  margin-left: 0.5rem;
               }
            }
         }
      }

      .item-expandable-content {
         .multi-attack {
            @include flex-row;
            @include flex-group-right;
            margin-top: 0.5rem;

            i {
               margin-left: 0.25rem;
            }
         }

         .attack-description {
            @include border-top;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            padding-bottom: 00.25rem;
            font-size: 0.9rem;
         }

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
               margin-top: 0.5rem;
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
      }
   }
</style>
