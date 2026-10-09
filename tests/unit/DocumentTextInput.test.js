import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';

describe('DocumentTextInput focus guard', () => {
   it('follows the model again once the input is disabled, without a blur event', async () => {
      const doc = {
         id: 'i1',
         uuid: 'Actor.a1.Item.i1',
         documentName: 'Item',
         isOwner: true,
         system: {},
         flags: {},
         update: async () => {},
      };
      const { rerender } = render(DocumentTextInput, {
         props: { value: 'first' },
         context: new Map([[
            'document',
            new ReactiveDocument(doc),
         ]]),
      });
      const input = screen.getByRole('textbox');
      expect(input.value).toBe('first');

      // A focused input keeps its text when the model changes.
      await fireEvent.focus(input);
      await rerender({ value: 'second' });
      expect(input.value, 'a focused input keeps its text').toBe('first');

      // The viewer loses ownership: the input is disabled and no blur event is dispatched.
      doc.isOwner = false;
      Hooks.call('updateItem', doc, {}, {});
      flushSync();
      expect(input.disabled).toBe(true);
      expect(input.value, 'a disabled input follows the model').toBe('second');
      await rerender({ value: 'third' });
      expect(input.value, 'and keeps following it').toBe('third');
   });
});
