import type { Metadata } from "next";
import { Galindo, Coiny, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import I18nProvider from "@/components/I18nProvider";
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

export const metadata: Metadata = {
  title: "Atenu Live",
  description: "Atenu Live — real-time multiplayer quiz games for Ethiopian students. Create, host, play.",
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
        <SessionWrapper>
          <I18nProvider>
            {children}
          </I18nProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
