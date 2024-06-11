<script>
   import {CUSTOM_ICON} from '~/system/Icons.js';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /**@type CustomEffectData Data for the effect this tag is for. */
   export let effect = void 0;

</script>

<div class="tag">
   <EffectTag {effect} icon={CUSTOM_ICON}/>
</div>

<style lang="scss">
   .tag {
      --titan-tag-background: linear-gradient(
            var(--titan-gradient-degree), var(--titan-custom-effect-primary), var(--titan-custom-effect-secondary) 100%
      );
   }
</style>