import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import StubChatMessage from '../components/StubChatMessage.svelte';

describe('ChatMessageContent', () => {
   beforeEach(() => {
      globalThis.game = { user: { isGM: true } };
   });

   afterEach(() => {
      delete globalThis.game;
   });

   it('renders the subtype component declared by system.component', () => {
      const documentStore = { data: { blind: false, system: { component: StubChatMessage } } };
      render(ChatMessageContent, { props: { documentStore } });
      expect(screen.getByTestId('stub-chat-component')).toBeTruthy();
   });

   it('renders nothing when no component is available', () => {
      const documentStore = { data: { blind: false, system: { component: undefined } } };
      const { container } = render(ChatMessageContent, { props: { documentStore } });
      expect(container.querySelector('[data-testid="stub-chat-component"]')).toBeNull();
   });
});
