import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createHash, createHmac } from "crypto";

// Verify Telegram Login Widget payload per Telegram's spec.
// https://core.telegram.org/widgets/login#checking-authorization
function verifyTelegramAuth(
  data: Record<string, string>,
  botToken: string
): boolean {
  const { hash, ...rest } = data;
  if (!hash || !botToken) return false;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  return hmac === hash;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // required behind Cloudflare Tunnel
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: {},
        first_name: {},
        last_name: {},
        username: {},
        photo_url: {},
        auth_date: {},
        hash: {},
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(credentials)) {
          if (v !== undefined && v !== null && v !== "") {
            data[k] = String(v);
          }
        }
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return null;
        if (!verifyTelegramAuth(data, botToken)) return null;
        // Reject payloads older than 1 day
        const authDate = parseInt(data.auth_date, 10);
        if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) {
          return null;
        }
        const displayName =
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          data.username ||
          `tg:${data.id}`;
        return {
          id: `tg:${data.id}`,
          name: displayName,
          email: data.username ? `${data.username}@telegram.local` : null,
          image: data.photo_url || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string };
        const t = token as Record<string, unknown>;
        if (u.id) {
          t.id = u.id;
          t.provider = u.id.startsWith("tg:") ? "telegram" : "google";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as Record<string, unknown>;
        const su = session.user as Record<string, unknown>;
        if (t.id) su.id = t.id;
        if (t.provider) su.provider = t.provider;
      }
      return session;
    },
  },
});
