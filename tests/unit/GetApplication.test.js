import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ApplicationProbe from '../components/ApplicationProbe.svelte';

describe('getApplication', () => {
   it('resolves the owning application from the "application" context', () => {
      render(ApplicationProbe, { context: new Map([['application', { name: 'Sheet' }]]) });
      expect(screen.getByTestId('app').textContent).toBe('Sheet');
   });
});
