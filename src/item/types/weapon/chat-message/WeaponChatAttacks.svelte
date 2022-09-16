<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import StatTag from "~/helpers/svelte-components/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/Tag.svelte";

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
               {attack.name}
            </div>
         </div>

         <div class="row stats">
            <!--Range-->
            <div class="stat">
               <StatTag label={localize("range")} value={attack.range} />
            </div>

            <!--Attribute-->
            <div class="stat">
               <StatTag label={localize("attribute")} value={localize(`${attack.attribute}`)} />
            </div>

            <!--Skill-->
            <div class="stat">
               <StatTag label={localize("skill")} value={localize(`${attack.skill}`)} />
            </div>

            <!--Damage-->
            <div class="stat">
               <StatTag
                  label={localize("damage")}
                  value={`${attack.damage}${attack.plusSuccessDamage === true ? localize("plusSuccess") : ""}`}
               />
            </div>

            <!--Traits-->
            {#each attack.traits as trait}
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
      list-style: none;
      margin: 0 0 0 0;
      padding: 0;
      font-size: 0.9rem;

      li {
         @include flex-column;
         @include border;
         padding: 0.25rem;
         background: var(--label-background-color);
         &:not(:first-child) {
            margin-top: 0.5rem;
         }

         .row {
            @include flex-row;
            width: 100%;
            flex-wrap: wrap;

            &.header {
               @include flex-group-center;
            }

            &.stats {
               @include flex-space-evenly;
            }

            .attack-name {
               font-size: 1rem;
               font-weight: bold;
            }

            .stat {
               margin: 0.25rem;
            }
         }
      }
   }
</style>
