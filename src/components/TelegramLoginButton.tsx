'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';

declare global {
  interface Window {
    onAtenuTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

interface Props {
  callbackUrl?: string;
  botUsername?: string;
}

export default function TelegramLoginButton({
  callbackUrl = '/host',
  botUsername = 'atenu_live_bot',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onAtenuTelegramAuth = (user) => {
      // Forward the verified payload to our NextAuth credentials provider
      signIn('telegram', {
        ...user,
        callbackUrl,
      });
    };

    if (!containerRef.current) return;

    // Clear before re-mounting (handles HMR / re-renders)
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onAtenuTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    containerRef.current.appendChild(script);

    return () => {
      window.onAtenuTelegramAuth = undefined;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [callbackUrl, botUsername]);

  return <div ref={containerRef} />;
}
