/**
 * robots.txt at /robots.txt. Tells crawlers which paths to index.
 *
 * Disallowed paths:
 * - /game/*    live game rooms — short-lived, gameId-keyed, not useful to index
 * - /host*     authenticated host pages — middleware will 302 anyway
 * - /auth/*    NextAuth callback pages
 * - /api/*     all API endpoints
 * - /debug/*   internal debug pages
 */

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://live.atenu.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/game/', '/host', '/auth/', '/api/', '/debug/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
