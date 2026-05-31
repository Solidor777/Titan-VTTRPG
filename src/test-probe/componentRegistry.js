import Button from '~/helpers/svelte-components/button/Button.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

/**
 * Registry of base primitives the test probe can mount in isolation. Keyed by the name passed to
 * `game.titan._probe.mount`. Extended one entry at a time as the probe coverage grows.
 * @type {Record<string, import('svelte').Component>}
 */
const componentRegistry = {
   Button,
   TextInput,
};

export default componentRegistry;
