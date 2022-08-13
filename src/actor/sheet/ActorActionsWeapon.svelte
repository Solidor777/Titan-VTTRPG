<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { slide } from "svelte/transition";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpandedObject = void 0;

   // Weapon list
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="actor-inventory-weapon-sheet">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <div class="item-expand-button">
            <EfxButton
               efx={ripple}
               on:click={() => {
                  isExpandedObject[id] = !isExpandedObject[id];
               }}
            >
               <div class="item-expand-button-inner">
                  <!--Image-->
                  <img class="item-image" src={item.img} alt="item" />

                  <!--Name-->
                  <div>{item.name}</div>

                  <!--Icon-->
                  <i class="fas fa-angle-double-down" />
               </div>
            </EfxButton>
         </div>

         <!--Controls-->
         <div class="item-controls">
            <!--Edit Button-->
            <div class="item-control-button">
               <IconButton icon={"fas fa-pen-to-square"} on:click={application.editItem.bind(application, item._id)} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <IconButton icon={"fas fa-trash"} on:click={application.deleteItem.bind(application, item._id)} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpandedObject[id] === true}
         <div class="item-expandable-content" transition:slide|local>
            <!--Attack Description-->
            <div class="attack-description">Temporary Attack Description</div>

            <!--Attacks list-->
            <ol>
               <!--Each Attack-->
               {#each Object.entries(item.system.attack) as [attackIdx, attack]}
                  <li>
                     <!--Attack Button-->
                     <div class="attack-button">
                        <EfxButton efx={ripple}>
                           <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
                           {attack.name}
                        </EfxButton>
                     </div>
                     <!--Dice Pool-->
                     <div class="attack-stat">
                        <i class="fas fa-dice-d6" />
                        {localize("LOCAL.dice.label")}:
                        {$document.system.attribute[attack.attribute].value +
                           $document.system.skill[attack.skill].training.value}
                     </div>
                     <!--Expertise-->
                     <div class="attack-stat">
                        <i class="fas fa-graduation-cap" />
                        {localize("LOCAL.expertise.label")}:
                        {$document.system.skill[attack.skill].expertise.value}
                     </div>

                     <!--Range-->
                     <div class="attack-stat">
                        <i class="fas fa-ruler" />
                        {localize("LOCAL.range.label")}:
                        {attack.range}
                     </div>

                     <!--Damage-->
                     <div class="attack-stat">
                        <i class="fas fa-bolt" />
                        {localize("LOCAL.damage.label")}:
                        {`${attack.damage}${
                           attack.plusSuccessDamage === true ? localize("LOCAL.plusSuccess.label") : ""
                        } `}
                     </div>
                  </li>
               {/each}
            </ol>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .actor-inventory-weapon-sheet {
      @include flex-column;
      width: 100%;

      .item-header {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;

         .item-expand-button {
            @include flex-row;
            width: 15rem;

            .item-expand-button-inner {
               @include flex-row;
               @include flex-space-between;
               width: 100%;
               height: 100%;

               .item-image {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.25rem;
                  width: 2rem;
                  border: none;
                  border-radius: 10px;
                  padding: 0.1rem;
                  background-color: black;
               }

               .fas {
                  margin-right: 0.25rem;
               }
            }
         }

         .item-controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .item-control-button {
               &:not(:first-child) {
                  margin-left: 0.5rem;
               }

               .spacer {
                  width: 0.5rem;
               }
            }
         }
      }

      .item-expandable-content {
         .attack-description {
            margin-top: 0.5rem;
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
               @include flex-row;
               @include flex-group-left;
               @include border;
               padding: 0.25rem;
               background-color: var(--label-background-color);

               .attack-stat {
                  margin-left: 0.5rem;
               }
            }
         }
      }
   }
</style>
