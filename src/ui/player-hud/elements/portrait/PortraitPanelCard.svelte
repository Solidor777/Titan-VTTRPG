<script>
   import { getContext } from 'svelte';
   import PortraitBars from '~/ui/player-hud/elements/portrait/PortraitBars.svelte';
   import PortraitUtilityRow from '~/ui/player-hud/elements/portrait/PortraitUtilityRow.svelte';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');
</script>

<div class="panel-card">
   <div class="portrait">
      <img
         src={document.data.img}
         alt={document.data.name}
      />
      <span class="name">{document.data.name}</span>
   </div>
   <PortraitBars/>
   <PortraitUtilityRow/>
</div>

<style lang="scss">
   .panel-card {
      @include panel-1;
      @include padding-standard;
      @include flex-column;
      @include flex-group-top;

      width: 200px;
      gap: var(--titan-spacing-standard);
      border-radius: var(--titan-border-radius);

      .portrait {
         position: relative;
         width: 100%;

         img {
            display: block;
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            border-radius: var(--titan-border-radius);
         }

         .name {
            @include font-size-small;

            position: absolute;
            inset: auto 0 0 0;
            padding: 2px 0;
            text-align: center;
            background: color-mix(in srgb, var(--titan-panel-1-background) 75%, transparent);
            border-radius: 0 0 var(--titan-border-radius) var(--titan-border-radius);
         }
      }
   }
</style>
