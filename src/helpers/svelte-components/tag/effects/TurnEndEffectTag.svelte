<script>
   import {TURN_END_ICON} from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /**@type TurnEffectData Data for the effect this tag is for. */
   export let effect = void 0;

</script>

<div class="tag">
   <EffectTag {effect} icon={TURN_END_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
            var(--titan-gradient-degree), var(--titan-turn-end-effect-primary), var(--titan-turn-end-effect-secondary) 100%
      );
   }
</style>