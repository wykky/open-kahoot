import type { Metadata, Viewport } from "next";
import { Galindo, Coiny, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

const galindo = Galindo({
  variable: "--font-title",
  subsets: ["latin"],
  weight: "400",
});

const chango = Coiny({
  variable: "--font-subtitle",
  subsets: ["latin"],
  weight: "400",
});

const notoEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://live.atenu.org";
const SITE_NAME = "Atenu Live";
const DEFAULT_DESCRIPTION =
  "Atenu Live — real-time multiplayer quiz games for Ethiopian high-school students. Create, host, play.";

/**
 * `title.template` lets per-page metadata supply just a short label like
 * `"Quiz library"` and Next renders `"Quiz library — Atenu Live"` in the
 * browser tab and on share cards. metadataBase makes relative URLs in
 * openGraph/twitter resolve absolute.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    locale: "en_ET",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
};

// PWA + mobile browser theme colour matches the brand yellow so the
// address bar tint and Android task-switcher card stay on-brand.
export const viewport: Viewport = {
  themeColor: '#FFC600',
};

const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (web browser)',
  inLanguage: 'en',
  audience: {
    '@type': 'EducationalAudience',
    educationalRole: 'student',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${galindo.variable} ${chango.variable} ${notoEthiopic.variable} antialiased`}
      >
        {/* Structured data — tells Google this is an EducationalApplication.
            Content is built from internal constants (no user input), and we
            escape < characters so a future change can't accidentally break
            out of the script tag. Standard safe pattern for inline JSON-LD. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webApplicationJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
