<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CharacterSheetSkill
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte';
   import { slide } from 'svelte/transition';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Filtered Skill list, recomputed whenever the document or the skills filter changes.
   /** @type {*[]} */
   const filteredList = $derived.by(() => {
      // Get skills whose name matches the filter.
      const skillList = Object.entries(document.data.system.skill);
      const filter = $appState.tabs.skills.filter.toLowerCase();
      let result = skillList.filter(([key]) => localize(key).toLowerCase().includes(filter));

      // If no skill names match, look for skills with matching default attributes.
      if (result.length === 0) {
         result = skillList.filter(([, skill]) =>
            localize(skill.defaultAttribute).toLowerCase().includes(filter));
      }

      return result;
   });
</script>

<ol>
   {#each filteredList as [key]}
      <li transition:slide|local>
         <CharacterSheetSkill {key}/>
      </li>
   {/each}
</ol>

<style lang="scss">

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list-base;
      @include panel-1;
      @include padding-standard;

      // The list owns the spacing between rows (`gap`, not the per-item separator of `list`); each row is a stripe.
      gap: var(--titan-spacing-standard);
      height: 100%;
      width: 100%;

      @include margin-bottom-standard;

      li {
         @include flex-row;
         @include flex-group-center;

         // Foundry's base styles give list items a bottom margin; the list `gap` alone spaces the rows.
         margin: 0;

         // An entry never gets narrower than its one-line row (the width comes from the Skills tab).
         min-width: var(--skill-row-min-width);
         width: 100%;
      }
   }
</style>
