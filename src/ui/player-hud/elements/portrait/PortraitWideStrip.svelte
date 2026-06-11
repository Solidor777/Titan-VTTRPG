<script>
   import { getContext } from 'svelte';
   import PortraitBars from '~/ui/player-hud/elements/portrait/PortraitBars.svelte';
   import PortraitUtilityRow from '~/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');
</script>

<div class="wide-strip">
   <img
      class="portrait"
      src={document.data.img}
      alt={document.data.name}
   />
   <div class="details">
      <span class="name">{document.data.name}</span>
      <PortraitBars/>
      <PortraitUtilityRow/>
   </div>
</div>

<style lang="scss">
   .wide-strip {
      @include panel-1;
      @include padding-standard;
      @include flex-row;
      @include flex-group-top;

      width: 320px;
      gap: var(--titan-spacing-standard);
      border-radius: var(--titan-border-radius);

      .portrait {
         display: block;
         width: 84px;
         height: 84px;
         flex-shrink: 0;
         object-fit: cover;
         border-radius: var(--titan-border-radius);
      }

      .details {
         @include flex-column;
         @include flex-group-top;

         flex: 1;
         gap: var(--titan-spacing-standard);

         .name {
            @include font-size-small;

            width: 100%;
            text-align: left;
         }
      }
   }
</style>
