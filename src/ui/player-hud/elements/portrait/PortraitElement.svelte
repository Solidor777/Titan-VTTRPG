<script>
   import PortraitPanelCard from '~/ui/player-hud/elements/portrait/PortraitPanelCard.svelte';
   import PortraitRoundToken from '~/ui/player-hud/elements/portrait/PortraitRoundToken.svelte';
   import PortraitWideStrip from '~/ui/player-hud/elements/portrait/PortraitWideStrip.svelte';

   /**
    * @typedef {object} PortraitElementProps
    * @property {object} options - The portrait element options.
    */

   /** @type {PortraitElementProps} */
   const { options } = $props();

   /** @type {object} Style key → component map. */
   const styles = {
      panelCard: PortraitPanelCard,
      roundToken: PortraitRoundToken,
      wideStrip: PortraitWideStrip,
   };

   /** @type {Component} The active style component. */
   const Style = $derived(styles[options.style] ?? PortraitPanelCard);
</script>

<Style/>
