<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import SidebarCheck from '~/document/svelte-components/check/SidebarCheck.svelte';
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
         <!--Attacks have no fixed DC (the target's defense sets it), so the header omits one. The
         function binding falls back to the seeded expanded default for freshly added attacks.-->
         <SidebarCheck
            attribute={attack.attribute}
            hasDetails={true}
            icon={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            label={attack.label}
            skill={attack.skill}
            bind:expanded={
               () => $appState.sidebar.attacks.isExpanded[idx] ?? true,
               (value) => $appState.sidebar.attacks.isExpanded[idx] = value
            }
         >
            <!--Attack details beyond the header basics-->
            <AttackTags
               {idx}
               hideBasics={true}
            />
         </SidebarCheck>
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
            @include margin-top-large;
         }
      }
   }
</style>
