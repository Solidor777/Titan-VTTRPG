<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import StatTag from "~/helpers/svelte-components/StatTag.svelte";
   import Tag from "../../../helpers/svelte-components/Tag.svelte";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
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
               <StatTag label={localize("LOCAL.range.label")} value={attack.range} />
            </div>

            <!--Attribute-->
            <div class="stat">
               <StatTag label={localize("LOCAL.attribute.label")} value={localize(`LOCAL.${attack.attribute}.label`)} />
            </div>

            <!--Skill-->
            <div class="stat">
               <StatTag label={localize("LOCAL.skill.label")} value={localize(`LOCAL.${attack.skill}.label`)} />
            </div>

            <!--Damage-->
            <div class="stat">
               <StatTag
                  label={localize("LOCAL.damage.label")}
                  value={`${attack.damage}${
                     attack.plusSuccessDamage === true ? localize("LOCAL.plusSuccess.label") : ""
                  }`}
               />
            </div>

            <!--Traits-->
            {#each attack.traits as trait}
               <div class="stat">
                  {#if trait.type === "number"}
                     <StatTag label={localize(`LOCAL.${trait.name}.label`)} value={trait.value} />
                  {:else}
                     <Tag label={localize(`LOCAL.${trait.name}.label`)} />
                  {/if}
               </div>
            {/each}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../styles/mixins.scss";

   ol {
      list-style: none;
      margin: 0 0 0 0;
      padding: 0;
      font-size: 0.9rem;

      li {
         @include flex-column;
         @include border;
         padding: 0.25rem;
         background-color: var(--label-background-color);
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
