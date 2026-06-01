import { describe, it, expect } from 'vitest';
import retryResolve from '~/helpers/utility-functions/RetryResolve.js';

describe('retryResolve', () => {
   it('returns the first truthy result without retrying', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return 'ok';
      }, { delayMs: 0 });
      expect(result).toBe('ok');
      expect(calls).toBe(1);
   });

   it('retries until the resolver returns a truthy value', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return calls >= 3 ? 'ok' : null;
      }, { delayMs: 0 });
      expect(result).toBe('ok');
      expect(calls).toBe(3);
   });

   it('returns null after exhausting the attempt budget', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return null;
      }, { attempts: 4, delayMs: 0 });
      expect(result).toBeNull();
      expect(calls).toBe(4);
   });

   it('defaults to 5 attempts when no attempt budget is provided', async () => {
      let calls = 0;
      const result = await retryResolve(() => {
         calls += 1;
         return null;
      }, { delayMs: 0 });
      expect(result).toBeNull();
      expect(calls).toBe(5);
   });
});
