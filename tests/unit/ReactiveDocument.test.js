import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentProbe from '../components/DocumentProbe.svelte';

describe('ReactiveDocument', () => {
   it('re-renders a reader when the wrapped document updates', () => {
      const doc = { id: 'a1', documentName: 'Actor', system: { value: 1 } };
      const bridge = new ReactiveDocument(doc);
      render(DocumentProbe, { context: new Map([['document', bridge]]) });
      expect(screen.getByTestId('value').textContent).toBe('1');

      // Mutate the live document and fire the corresponding update hook.
      doc.system.value = 2;
      Hooks.call('updateActor', doc, {}, {});
      flushSync();

      expect(screen.getByTestId('value').textContent).toBe('2');
   });
});
