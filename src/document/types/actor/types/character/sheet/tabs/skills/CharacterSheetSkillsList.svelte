<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CharacterSheetSkill
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte';
   import {slideFade} from '@typhonjs-fvtt/runtime/svelte/transition';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Filtered Skill list
   let filteredList = [];
   $: {
      // Get skills whose name matches the filter
      const skillList = Object.entries($document.system.skill);
      const filter = $appState.filter.skills.toLowerCase();
      filteredList = skillList.filter(([key]) => localize(key).toLowerCase().includes(filter));

      // If no skill names match, look for skills with matching default attributes.
      if (filteredList.length === 0) {
         filteredList = skillList.filter(([key, value]) =>
            localize(value.defaultAttribute).toLowerCase().includes(filter));
      }
   }
</script>

<ol>
   {#each filteredList as [key]}
      <li transition:slideFade|local>
         <CharacterSheetSkill {key}/>
      </li>
   {/each}
</ol>

<style lang="scss">

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      @include panel-1;

      height: 100%;
      width: 100%;
      margin-bottom: var(--titan-padding-standard);

      li {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
         }

         &:not(:last-child) {
            @include border-bottom;

            margin-bottom: var(--titan-padding-large);
         }
      }
   }
</style>
