<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.data.chatContext;
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
               <div class="label">
                  {localize("LOCAL.range.label")}:
               </div>
               <div class="value">
                  {attack.range}
               </div>
            </div>

            <!--Attribute-->
            <div class="stat">
               <div class="label">
                  {localize("LOCAL.attribute.label")}:
               </div>
               <div class="value">
                  {localize(`LOCAL.${attack.attribute}.label`)}
               </div>
            </div>

            <!--Skill-->
            <div class="stat">
               <div class="label">
                  {localize("LOCAL.skill.label")}:
               </div>
               <div class="value">
                  {localize(`LOCAL.${attack.skill}.label`)}
               </div>
            </div>

            <!--Damage-->
            <div class="stat">
               <div class="label">
                  {localize("LOCAL.damage.label")}:
               </div>
               <div class="value">
                  {`${attack.damage}${attack.plusSuccessDamage === true ? localize("LOCAL.plusSuccess.label") : ""} `}
               </div>
            </div>

            <!--Traits-->
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

<style lang="scss">
   @import "../../styles/mixins.scss";

   ol {
      @include border-top;
      list-style: none;
      margin: 0 0 0.5rem 0;
      padding: 0;
      font-size: 0.9rem;

      li {
         @include flex-column;
         @include border;
         padding: 0.25rem;
         margin-top: 0.5rem;
         background-color: var(--label-background-color);

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

            &.traits {
               @include flex-space-evenly;
            }

            .attack-name {
               font-size: 1rem;
               font-weight: bold;
            }

            .stat {
               @include flex-row;
               @include flex-group-center;
               @include border;
               font-weight: bold;
               margin: 0.25rem;
               padding: 0.25rem;

               .value {
                  margin-left: 0.25rem;
               }
            }

            .trait {
               @include flex-row;
               @include flex-group-center;
               @include border;
               font-weight: bold;
               margin: 0.25rem;
               padding: 0.25rem;
            }
         }
      }
   }
</style>
