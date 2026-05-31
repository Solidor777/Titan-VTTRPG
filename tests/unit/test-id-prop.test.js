import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ButtonProbe from '../components/ButtonProbe.svelte';
import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

describe('testId prop on base primitives', () => {
   it('Button applies data-testid to the native button when provided', () => {
      const { container } = render(ButtonProbe, { props: { testId: 'add-trait' } });
      expect(container.querySelector('button[data-testid="add-trait"]')).not.toBeNull();
   });

   it('Button omits data-testid when not provided', () => {
      const { container } = render(ButtonProbe, {});
      expect(container.querySelector('button[data-testid]')).toBeNull();
   });

   it('TextInput applies data-testid to the native input when provided', () => {
      const { container } = render(TextInput, { props: { testId: 'trait-name' } });
      expect(container.querySelector('input[data-testid="trait-name"]')).not.toBeNull();
   });
});
