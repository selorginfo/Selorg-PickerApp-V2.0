import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { supportApi } from '../services/api/supportApi';
import { ApiError } from '../services/api/client';

export function useSupport() {
  const { state, dispatch } = useStore();
  const { support } = state;
  const busyRef = useRef(false);
  const [sending, setSending] = useState(false);

  const loadChat = useCallback(async () => {
    try {
      const messages = await supportApi.getChatMessages();
      dispatch({ type: 'support/setMessages', messages });
    } catch {
      // Keep whatever is already in state if the inbox cannot load.
    }
  }, [dispatch]);

  useEffect(() => {
    loadChat().catch(() => undefined);
  }, [loadChat]);

  const sendChat = useCallback(
    async (overrideText?: string) => {
      const t = (overrideText ?? support.chatInput).trim();
      if (!t || busyRef.current) return;
      if (t.length > 2000) {
        dispatch({ type: 'ui/setToast', value: 'Message must be 2000 characters or less' });
        return;
      }
      busyRef.current = true;
      setSending(true);
      dispatch({ type: 'support/setTyping', value: true });
      // Keep input until API succeeds so FAILED → RETRY restores the draft.
      try {
        await supportApi.sendMessage({ text: t });
        dispatch({ type: 'support/setChatInput', value: '' });
        const messages = await supportApi.getChatMessages();
        dispatch({ type: 'support/setMessages', messages });
      } catch (e) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Failed to send message',
        });
        if (overrideText) {
          dispatch({ type: 'support/setChatInput', value: t });
        }
      } finally {
        dispatch({ type: 'support/setTyping', value: false });
        busyRef.current = false;
        setSending(false);
      }
    },
    [support.chatInput, dispatch],
  );

  return {
    ...support,
    sending,
    setChatInput: (value: string) =>
      dispatch({ type: 'support/setChatInput', value: value.slice(0, 2000) }),
    canSend: Boolean(support.chatInput.trim()) && !support.chatTyping && !sending,
    sendChat: () => {
      sendChat().catch(() => undefined);
    },
    quickChat: (t: string) => {
      sendChat(t).catch(() => undefined);
    },
  };
}
