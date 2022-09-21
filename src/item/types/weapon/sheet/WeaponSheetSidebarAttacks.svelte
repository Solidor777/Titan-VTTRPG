<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<ol>
   {#each Object.entries($document.system.attack) as [idx, attack] (attack.uuid)}
      <li transition:slide|local>
         <!--Label-->
         <div class="header">
            {attack.label}
         </div>

         <div class="stats">
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
                  value={`${attack.damage}${attack.plusSuccessDamage ? ` ${localize("plusSuccess")}` : ""}`}
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
         padding-top: 0.25rem;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
         }

         .header {
            @include flex-row;
            @include flex-group-center;
            @include border-top-bottom;
            @include panel-1;
            font-weight: bold;
            width: 100%;
            padding: 0.25rem 0;
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            flex-wrap: wrap;

            .stat {
               margin: 0.5rem 0.25rem 0 0.25rem;
            }
         }
      }
   }
</style>