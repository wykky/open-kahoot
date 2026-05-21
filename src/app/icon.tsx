/**
 * 192x192 PNG generated at build time via Next's ImageResponse. Acts as the
 * primary PWA/manifest icon. The favicon.ico in this folder stays the legacy
 * fallback for very old browsers; modern browsers prefer this larger PNG.
 */

import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFC600',
          color: '#000',
          fontSize: 130,
          fontWeight: 900,
          letterSpacing: -6,
          fontFamily: 'system-ui',
          border: '12px solid #000',
          borderRadius: 32,
          boxSizing: 'border-box',
        }}
      >
        AL
      </div>
    ),
    { ...size }
  );
}
