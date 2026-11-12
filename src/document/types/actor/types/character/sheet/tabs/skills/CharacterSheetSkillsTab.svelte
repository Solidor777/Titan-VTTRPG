<script>
   import { getContext } from 'svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import CharacterSheetSkillsHeader
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsHeader.svelte';
   import CharacterSheetSkillsList
   from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<div class="skill-tab">
   <!--Filter-->
   <div class="header">
      <TopFilter bind:value={$appState.tabs.skills.filter}/>
   </div>

   <!--Column labels-->
   <CharacterSheetSkillsHeader/>

   <div class="scrolling-container">
      <ScrollingContainer bind:scrollTop={$appState.tabs.skills.scrollTop}>
         <CharacterSheetSkillsList/>
      </ScrollingContainer>
   </div>

   <!--Each skill-->
</div>

<style lang="scss">
   // The column geometry shared by the column header and every skill row (custom properties inherit into both). The
   // character sheet is not resizable and is 1000px wide, which leaves the skill name track room to reach its maximum.
   .skill-tab {
      // Margin, border and padding of one `separator-left-large`: a divided column holds its divider plus its content.
      --skill-separator: calc(var(--titan-spacing-large) * 2 + var(--titan-border-width));

      // The Attribute select, sized to the widest attribute (icon, label and chevron).
      --skill-attribute-width: 100px;

      // The cells of one Training or Expertise group: icon, base input, plus, mod input, equals, total.
      --skill-stat-columns: 16px 28px 10px 28px 10px 28px;
      --skill-stat-gap: var(--titan-spacing-standard);
      --skill-stat-width: calc(120px + 5 * var(--skill-stat-gap));

      // Tracks that include their divider.
      --skill-attribute-track: calc(var(--skill-attribute-width) + var(--skill-separator));
      --skill-stat-track: calc(var(--skill-stat-width) + var(--skill-separator));

      // Bounds of the skill name column. The minimum holds the longest default skill name (a roll button measured
      // about 201px wide) on one line with some slack; the maximum keeps the name from drifting away from the
      // Attribute column.
      --skill-name-min: 220px;
      --skill-name-max: 260px;

      // Skill name, Attribute select, Training, Expertise. The tracks are packed against the left edge of a row and
      // the header (`justify-content: start` where this is used), so room beyond their total trails them.
      --skill-columns:
         minmax(var(--skill-name-min), var(--skill-name-max))
         var(--skill-attribute-track)
         var(--skill-stat-track)
         var(--skill-stat-track);

      // The narrowest a skill entry can be: the four columns at their minimum plus the row's left and right padding.
      --skill-columns-min-width: calc(var(--skill-name-min) + var(--skill-attribute-track) + 2 * var(--skill-stat-track));
      --skill-row-padding: calc(var(--titan-spacing-large) + var(--titan-spacing-standard));
      --skill-row-min-width: calc(var(--skill-columns-min-width) + var(--skill-row-padding));

      @include flex-column;
      @include flex-group-center;
      @include panel-1;

      width: 100%;
      height: 100%;

      .header {
         width: 100%;
      }

      .scrolling-container {
         position: relative;
         width: 100%;
         height: 100%;
      }
   }
</style>
