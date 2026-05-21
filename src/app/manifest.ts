/**
 * Web App Manifest at /manifest.webmanifest.
 * Lets Android (and iOS to a lesser extent) treat Atenu Live as a PWA —
 * add-to-home-screen, splash screen, standalone display mode. Icons are
 * auto-resolved from src/app/icon.tsx + src/app/apple-icon.tsx.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Atenu Live',
    short_name: 'Atenu Live',
    description:
      'Real-time multiplayer quiz games for Ethiopian high-school students. Create, host, play.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFC600',
    theme_color: '#FFC600',
    categories: ['education', 'games'],
    lang: 'en',
  };
}
