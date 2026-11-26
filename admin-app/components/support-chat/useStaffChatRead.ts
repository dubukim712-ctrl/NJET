import { useEffect, useRef } from 'react';
import { markSupportChatThreadReadAction } from '@/data/actions/support-chat';

export function useStaffChatRead(threadId: string, messageId: string | undefined) {
  const conversation = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = conversation.current;
    if (!element || !messageId) return;

    let active = true;
    let started = false;
    const markRead = () => {
      if (!active || started || document.visibilityState !== 'visible'
        || !document.hasFocus() || !element.getClientRects().length) return;

      started = true;
      void markSupportChatThreadReadAction({ threadId, messageId })
        .then((result) => { if (!result.success) started = false; })
        .catch(() => { started = false; });
    };

    const observer = new ResizeObserver(markRead);
    observer.observe(element);
    window.addEventListener('focus', markRead);
    document.addEventListener('visibilitychange', markRead);
    markRead();

    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('focus', markRead);
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [threadId, messageId]);

  return conversation;
}
