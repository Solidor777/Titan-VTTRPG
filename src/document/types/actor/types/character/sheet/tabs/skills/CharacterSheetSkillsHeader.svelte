<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { EXPERTISE_ICON, TRAINING_ICON } from '~/system/Icons.js';

   /** @type {{icon: string, label: string}[]} The Training and Expertise column groups. */
   const statGroups = [
      {
         icon: TRAINING_ICON,
         label: 'training',
      },
      {
         icon: EXPERTISE_ICON,
         label: 'expertise',
      },
   ];

   /** @type {string[]} The sub-labels of each group, over the base input, the mod input and the total. */
   const subLabels = [
      'base',
      'mod',
      'total',
   ];
</script>

<!--Column labels, on the same tracks as the skill rows-->
<div class="head">
   <div class="head-columns">
      <div class="head-cell head-name">
         <div class="head-label">{localize('skill')}</div>
      </div>

      <div class="head-cell head-attribute">
         <div class="head-label">{localize('attribute')}</div>
      </div>

      {#each statGroups as group (group.label)}
         <div class="head-cell head-group">
            <div class="head-label">
               <i class={group.icon}></i>{localize(group.label)}
            </div>
            <div class="head-sub">
               {#each subLabels as subLabel, index (subLabel)}
                  <span style:grid-column={index * 2 + 2}>{localize(subLabel)}</span>
               {/each}
            </div>
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   // The wrapper reserves the same always-on scrollbar gutter as the scrolling skill list, with an invisible bar, so
   // the columns stay aligned with the rows whatever the scrollbar looks like. Its horizontal padding matches the
   // list (`padding-standard`) and a row (`padding: standard standard standard large`).
   .head {
      @include border-bottom;

      flex: none;
      overflow: hidden scroll;
      scrollbar-color: transparent transparent;
      scrollbar-gutter: stable;
      width: 100%;

      .head-columns {
         display: grid;
         grid-template-columns: var(--skill-columns);
         justify-content: start;
         margin: 0 var(--titan-spacing-standard);
         padding: var(--titan-spacing-standard) var(--titan-spacing-standard) 0 var(--titan-spacing-large);
      }

      .head-cell {
         @include flex-column;

         align-items: center;
         justify-content: center;
         min-width: 0;
         padding-bottom: var(--titan-spacing-standard);
      }

      .head-name {
         align-items: flex-start;
         padding-left: var(--titan-spacing-large);
      }

      .head-attribute,
      .head-group {
         @include separator-left-large;
      }

      .head-label {
         @include section-label;

         line-height: 18px;
         white-space: nowrap;

         i {
            font-size: 12px;

            @include margin-right-standard;
         }
      }

      .head-sub {
         @include font-size-small;

         display: grid;
         grid-template-columns: var(--skill-stat-columns);
         column-gap: var(--skill-stat-gap);
         opacity: 0.8;
         width: var(--skill-stat-width);

         span {
            justify-self: center;
            line-height: 16px;
            white-space: nowrap;
         }
      }
   }
</style>
