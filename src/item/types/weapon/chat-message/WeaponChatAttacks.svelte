<script>
   import { localize } from "~/helpers/Utility.js";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import IconStatTag from "~/helpers/svelte-components/tag/IconStatTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";
   import IconTag from "~/helpers/svelte-components/tag/IconTag.svelte";

   export let item = void 0;
</script>

<ol>
   {#each Object.entries(item.system.attack) as [attackIdx, attack]}
      <!--Each attack-->
      <li>
         <div class="row header">
            <!--Attack Button-->
            <div class="attack-name">
               <i class="fas fa-{attack.type === 'melee' ? 'sword' : 'bow-arrow'}" />
               {attack.label}
            </div>
         </div>

         <div class="row stats">
            <!--Damage-->
            <div class="stat">
               <IconStatTag
                  icon={"fas fa-bolt"}
                  label={localize("damage")}
                  value={`${attack.damage}${
                     attack.plusExtraSuccessDamage ? ` + ${localize("extraSuccesses.short")}` : ""
                  }`}
               />
            </div>

            <!--Type-->
            <div class="stat">
               <IconTag
                  icon={attack.type === "melee" ? "fas fa-sword" : "fas fa-bow-arrow"}
                  label={localize(attack.type)}
               />
            </div>

            <!--Range-->
            {#if attack.range !== 1}
               <div class="stat">
                  <IconStatTag label={localize("range")} value={attack.range} icon={"fas fa-ruler"} />
               </div>
            {/if}

            <!--Attribute and skill-->
            <div class="stat">
               <AttributeTag
                  attribute={attack.attribute}
                  label={`${localize(attack.attribute)} (${localize(attack.skill)})`}
               />
            </div>

            <!--Traits-->
            {#each attack.trait as trait}
               <div class="stat" data-tooltip={localize(`${trait.name}.desc`)}>
                  {#if trait.type === "number"}
                     <StatTag label={localize(`${trait.name}`)} value={trait.value} />
                  {:else}
                     <Tag label={localize(`${trait.name}`)} />
                  {/if}
               </div>
            {/each}

            <!--Custom Traits-->
            {#each attack.customTrait as trait}
               <div class="stat" data-tooltip={trait.description}>
                  <Tag label={trait.name} />
               </div>
            {/each}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../../styles/mixins.scss";

   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;
      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
         }

         .row {
            @include flex-row;
            width: 100%;
            flex-wrap: wrap;

            &.header {
               @include flex-group-center;
            }

            &.stats {
               @include flex-group-center;

               .stat {
                  @include tag-margin;
               }
            }

            .attack-name {
               @include font-size-normal;
               font-weight: bold;
            }
         }
      }
   }
</style>
