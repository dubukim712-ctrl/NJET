import { useEffect, useRef } from 'react';

export function useChatViewport() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;

    function update() {
      if (!element || !viewport) return;
      const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      element.style.setProperty('--chat-viewport-bottom', viewport.scale === 1 ? `${bottom}px` : '0px');
    }

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return ref;
}
