<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
   const appState = getContext("ApplicationStateStore");

   // Initialize expanded state
   $document.system.attack.forEach((entry, idx) => {
      $appState.isExpanded.sidebar.attack[idx] = $appState.isExpanded.sidebar.attack[idx] ?? true;
   });
</script>

<ol>
   {#each $document.system.attack as attack, idx (attack.uuid)}
      <li transition:slide|local>
         <!--Label-->
         <div class="header">
            <div class="spacer" />

            <!--Label-->
            <div class="label">
               <!-- Text-->
               <div class="text">
                  {attack.label}
               </div>

               <!--Icon-->
               <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
            </div>

            <!--Expand Toggle-->
            <div class="spacer">
               {#if $appState.isExpanded.sidebar.attack[idx]}
                  <!--Collapse button-->
                  <IconButton
                     icon="fas fa-angle-double-down"
                     on:click={() => {
                        $appState.isExpanded.sidebar.attack[idx] = false;
                     }}
                  />
               {:else}
                  <!--Expand button-->
                  <IconButton
                     icon="fas fa-angle-double-right"
                     on:click={() => {
                        $appState.isExpanded.sidebar.attack[idx] = true;
                     }}
                  />
               {/if}
            </div>
         </div>

         {#if $appState.isExpanded.sidebar.attack[idx]}
            <div class="stats" transition:slide|local>
               <!--Attack Type-->
               <div class="stat">
                  <Tag label={localize(attack.type)} />
               </div>

               <!--Range-->
               <div class="stat">
                  <StatTag label={localize("range")} value={attack.range} />
               </div>

               <!--Damage-->
               <div class="stat">
                  <StatTag
                     label={localize("damage")}
                     value={`${attack.damage}${
                        attack.plusExtraSuccessDamage ? ` ${localize("plusExtraSuccess.short")}` : ""
                     }`}
                  />
               </div>

               <!--Skill & Attribute-->
               <div class="stat">
                  <AttributeTag
                     attribute={attack.attribute}
                     label={`${localize(attack.attribute)} (${localize(attack.skill)})`}
                  />
               </div>

               {#each attack.trait as trait (trait.name)}
                  <div class="stat" data-tooltip={localize(`${trait.name}.desc`)}>
                     {#if trait.type === "number"}
                        <!--Number Trait-->
                        <StatTag label={localize(trait.name)} value={trait.value} />
                     {:else}
                        <!--Bool Trait-->
                        <Tag label={localize(trait.name)} />
                     {/if}
                  </div>
               {/each}
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         padding-bottom: 0.25rem;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
         }

         .header {
            @include flex-row;
            @include flex-space-between;
            @include border-bottom;
            @include panel-1;
            font-weight: bold;
            width: 100%;
            padding: 0.25rem;

            .label {
               @include flex-row;
               @include flex-group-center;
               width: 100%;

               .text {
                  @include flex-row;
                  @include flex-group-center;
               }

               i {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: 0.25rem;
               }
            }

            .spacer {
               @include flex-row;
               @include flex-group-center;
               width: 3rem;
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;
            width: calc(100% - 0.5rem);
            flex-wrap: wrap;
            padding: 0 0.25rem 0.5rem 0.25rem;

            .stat {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>
