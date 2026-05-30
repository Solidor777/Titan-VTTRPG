<script>
   import { TURN_START_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: TurnEffectData }} Data for this tag's Effect. */
   let { effect = void 0 } = $props();
</script>

<div class="tag">
   <EffectTag {effect} icon={TURN_START_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
         var(--titan-gradient-degree), var(--titan-turn-start-effect-primary), var(--titan-turn-start-effect-secondary) 100%
      );
   }
</style>
