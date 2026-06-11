<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
   import {
      ACCURACY_ICON,
      MELEE_ICON,
   } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<ol>
   {#each document.data.system.attack as attack, idx (attack.uuid)}
      <li transition:slide|local>
         <!--Label-->
         <div class="header">
            <div class="spacer"></div>

            <!--Label-->
            <div class="label">
               <!--Icon-->
               <i class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}></i>
               <!-- Text-->
               <div class="text">
                  {attack.label}
               </div>
            </div>

            <!--Expand Toggle (shared component, matching the item-check sidebar). Function binding:
            a freshly added attack renders before the state array grows, so the read falls back to
            the seeded default (expanded) instead of binding undefined.-->
            <div class="spacer">
               <ExpandButton
                  bind:expanded={
                     () => $appState.sidebar.attacks.isExpanded[idx] ?? true,
                     (value) => $appState.sidebar.attacks.isExpanded[idx] = value
                  }
               />
            </div>
         </div>

         {#if $appState.sidebar.attacks.isExpanded[idx] ?? true}
            <div class="stats" transition:slide|local>
               <AttackTags {idx}/>
            </div>
         {/if}
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-large;
         }

         .header {
            @include flex-row;
            @include flex-space-between;
            @include border-bottom;
            @include panel-1;

            font-weight: bold;
            width: 100%;

            @include padding-standard;

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
                  @include margin-right-standard;
               }
            }

            .spacer {
               @include flex-row;
               @include flex-group-center;

               width: 48px;
            }
         }

         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;

            width: calc(100% - var(--titan-spacing-large));
            padding: 0 var(--titan-spacing-standard) var(--titan-spacing-large) var(--titan-spacing-standard);
         }
      }
   }
</style>
