<script>
   import EffectsDetailPopout from '~/ui/player-hud/elements/effects-panel/EffectsDetailPopout.svelte';

   /**
    * @typedef {object} EffectsIconTrayProps
    * @property {Array<TitanActiveEffect>} conditions - Condition-subtype effects on the actor.
    * @property {Array<TitanActiveEffect>} effects - Effect-subtype effects on the actor.
    * @property {HudLayoutState} layoutState - Shared layout/UI state (for popout clamping).
    */

   /** @type {EffectsIconTrayProps} */
   const { conditions, effects, layoutState } = $props();

   /** @type {string | null} The selected effect's id, whose detail popout is open. */
   let selectedId = $state(null);

   /** @type {{x: number, y: number}} The clicked icon's viewport point, anchoring the popout. */
   let anchor = $state({ x: 0, y: 0 });

   /** @type {Array<TitanActiveEffect>} All entries, conditions first. */
   const entries = $derived([...conditions, ...effects]);

   /** @type {TitanActiveEffect | null} The selected effect, when it still exists. */
   const selected = $derived(entries.find((effect) => effect.id === selectedId) ?? null);

   /**
    * Selects an effect and anchors its detail popout beside the clicked icon.
    * @param {TitanActiveEffect} effect - The clicked effect.
    * @param {MouseEvent} event - The click event carrying the icon's box.
    * @returns {void}
    */
   function select(effect, event) {
      /** @type {DOMRect} The clicked icon's box. */
      const box = event.currentTarget.getBoundingClientRect();
      anchor = { x: box.right + 6, y: box.top };
      selectedId = selectedId === effect.id ? null : effect.id;
   }
</script>

<div class="icon-grid">
   {#each entries as effect (effect.id)}
      <button
         class="grid-icon"
         type="button"
         title={effect.name}
         aria-label={effect.name}
         data-testid="player-hud-effect-icon"
         onclick={(event) => select(effect, event)}
      >
         <img
            src={effect.img}
            alt={effect.name}
         />
         {#if effect.type === 'effect' && effect.system.duration.type !== 'permanent'}
            <span class="badge">{effect.system.duration.remaining}</span>
         {/if}
      </button>
   {/each}
</div>

{#if selected}
   <EffectsDetailPopout
      effect={selected}
      {anchor}
      {layoutState}
      onClose={() => selectedId = null}
   />
{/if}

<style lang="scss">
   .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 34px);
      gap: var(--titan-spacing-standard);
      width: 100%;

      .grid-icon {
         position: relative;
         width: 34px;
         height: 34px;
         padding: 0;
         background: none;
         border: none;
         cursor: pointer;

         img {
            width: 100%;
            height: 100%;
            object-fit: contain;
         }

         .badge {
            @include panel-3;

            position: absolute;
            right: -2px;
            bottom: -2px;
            min-width: 14px;
            padding: 0 2px;
            font-size: 10px;
            text-align: center;
            border-radius: var(--titan-border-radius);
         }
      }
   }
</style>
