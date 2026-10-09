<script>
   import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
   import { EFFECT_TYPE } from '~/system/EffectTypes.js';
   import EffectsDetailPopout from '~/ui/player-hud/elements/effects-panel/EffectsDetailPopout.svelte';
   import { getSuppressingImmunitySources } from '~/document/types/active-effect/IsSuppressedByImmunity.js';

   /**
    * @typedef {object} EffectsIconTrayProps
    * @property {Array<TitanActiveEffect>} conditions - Condition-subtype effects on the actor.
    * @property {Array<TitanActiveEffect>} effects - Effect-subtype and `base` effects on the actor.
    * @property {HudLayoutState} layoutState - Shared layout/UI state (for popout clamping).
    */

   /** @type {EffectsIconTrayProps} */
   const { conditions, effects, layoutState } = $props();

   /** @type {string | null} The selected effect's id, whose detail popout is open. */
   let selectedId = $state(null);

   /** @type {{x: number, y: number}} The clicked icon's viewport point, anchoring the popout. */
   let anchor = $state({
      x: 0,
      y: 0,
   });

   /** @type {Array<TitanActiveEffect>} All entries, conditions first. */
   const entries = $derived([
      ...conditions,
      ...effects,
   ]);

   /**
    * The names of the immunities suppressing each suppressed entry, keyed by effect id. It re-derives with
    * `entries`, whose source arrays the panel derives from the actor bridge, so any actor or embedded-document
    * change refreshes it.
    * @type {Map<string, string[]>}
    */
   const suppressingSources = $derived(new Map(entries
      .map((effect) => [
         effect.id,
         getSuppressingImmunitySources(effect).map((source) => source.name),
      ])
      .filter(([, names]) => names.length > 0)));

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
      anchor = {
         x: box.right + 6,
         y: box.top,
      };
      selectedId = selectedId === effect.id ? null : effect.id;
   }
</script>

<div class="icon-grid">
   {#each entries as effect (effect.id)}
      <button
         class="grid-icon"
         class:suppressed={suppressingSources.has(effect.id)}
         type="button"
         title={effect.name}
         aria-label={effect.name}
         data-effect-id={effect.id}
         data-testid="player-hud-effect-icon"
         onclick={(event) => select(effect, event)}
      >
         <img
            src={effect.img}
            alt={effect.name}
         />
         {#if effect.type === EFFECT_TYPE && effect.system.duration.type !== DURATION_PERMANENT}
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
      suppressingSources={suppressingSources.get(selected.id) ?? []}
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

         // A suppressed entry's icon is dimmed; its popout names the immunity.
         &.suppressed img {
            opacity: 0.5;
         }
      }
   }
</style>
