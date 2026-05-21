/**
 * 180x180 apple-touch-icon. Next auto-injects
 * <link rel="apple-touch-icon" sizes="180x180" /> when this file is present.
 * Apple recommends a solid background (no transparency) because iOS masks
 * the corners itself, which is exactly what the yellow fill gives us.
 */

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 900,
          letterSpacing: -6,
          fontFamily: 'system-ui',
        }}
      >
        AL
      </div>
    ),
    { ...size }
  );
}
