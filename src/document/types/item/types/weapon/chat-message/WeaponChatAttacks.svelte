<script>
   import { getContext } from 'svelte';
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
   import {
      ACCURACY_ICON,
      MELEE_ICON,
   } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store (the chat-message bridge). */
   const document = getContext('document');

   /** @type {object[]} The snapshot attack array carried by the chat message's system data. */
   const attacks = $derived(document.data?.system.attack ?? []);
</script>

<ol>
   {#each attacks as attack, idx (idx)}
      <!--Each attack-->
      <li>
         <div class="row header">
            <!--Attack name-->
            <div class="attack-name">
               <i class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}></i>
               {attack.label}
            </div>
         </div>

         <!--Intrinsic attack tags (shared component; path parity with the weapon document)-->
         <div class="row stats">
            <AttackTags {idx}/>
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
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
            @include margin-top-large;
            @include padding-top-large;
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
            }

            .attack-name {
               @include font-size-normal;

               font-weight: bold;
            }
         }
      }
   }
</style>
