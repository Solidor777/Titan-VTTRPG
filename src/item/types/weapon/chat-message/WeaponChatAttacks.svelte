<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import IconStatTag from "../../../../helpers/svelte-components/tag/IconStatTag.svelte";
   import AttributeTag from "../../../../helpers/svelte-components/tag/AttributeTag.svelte";
   import IconTag from "../../../../helpers/svelte-components/tag/IconTag.svelte";

   // Chat context reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<ol class="attacks">
   {#each Object.entries(chatContext.system.attack) as [attackIdx, attack]}
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
               <div class="stat">
                  {#if trait.type === "number"}
                     <StatTag label={localize(`${trait.name}`)} value={trait.value} />
                  {:else}
                     <Tag label={localize(`${trait.name}`)} />
                  {/if}
               </div>
            {/each}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../../styles/mixins.scss";

   ol {
      @include font-size-small;
      list-style: none;
      margin: 0 0 0 0;
      padding: 0;

      li {
         @include flex-column;
         padding: 0.25rem;

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
                  @include tag-padding;
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
