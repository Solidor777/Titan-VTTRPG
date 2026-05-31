import Button from '~/helpers/svelte-components/button/Button.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';
import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
import Select from '~/helpers/svelte-components/input/select/Select.svelte';
import LabelTag from '~/helpers/svelte-components/tag/LabelTag.svelte';

/**
 * Registry of base primitives the test probe can mount in isolation. Keyed by the name passed to
 * `game.titan._probe.mount`. Extended one entry at a time as the probe coverage grows.
 * @type {Record<string, import('svelte').Component>}
 */
const componentRegistry = {
   Button,
   TextInput,
   NumberInput,
   IntegerInput,
   CheckboxInput,
   Select,
   LabelTag,
};

export default componentRegistry;
