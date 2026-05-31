<script>
   import { INITIATIVE_ICON } from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type {{ effect: InitiativeEffectData, testId?: string }} Data for this tag's Effect plus an optional test id. */
   let { effect = void 0, testId = void 0 } = $props();
</script>

<div class="tag" data-testid={testId}>
   <EffectTag {effect} icon={INITIATIVE_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
         var(--titan-gradient-degree), var(--titan-initiative-effect-primary), var(--titan-initiative-effect-secondary) 100%
      );
   }
</style>
