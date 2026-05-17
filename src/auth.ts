import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createHash, createHmac } from "crypto";

// Verify Telegram Login Widget payload per Telegram's spec.
// https://core.telegram.org/widgets/login#checking-authorization
const TELEGRAM_FIELDS = new Set([
  "id",
  "first_name",
  "last_name",
  "username",
  "photo_url",
  "auth_date",
]);

function verifyTelegramAuth(
  data: Record<string, string>,
  botToken: string
): boolean {
  const { hash } = data;
  if (!hash || !botToken) return false;
  // Only include Telegram's signed fields — exclude csrfToken, callbackUrl, etc.
  const rest: Record<string, string> = {};
  for (const k of Object.keys(data)) {
    if (TELEGRAM_FIELDS.has(k)) rest[k] = data[k];
  }
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  console.error(
    "[tg-auth] dataCheckString=" + JSON.stringify(dataCheckString) +
    " computedHmac=" + hmac +
    " receivedHash=" + hash
  );
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
        console.error("[tg-auth] authorize called with keys=" + JSON.stringify(credentials ? Object.keys(credentials) : "no-credentials"));
        if (!credentials) return null;
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(credentials)) {
          if (v !== undefined && v !== null && v !== "") {
            data[k] = String(v);
          }
        }
        console.error("[tg-auth] data=" + JSON.stringify(data));
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          console.error("[tg-auth] FAIL: TELEGRAM_BOT_TOKEN not set");
          return null;
        }
        if (!verifyTelegramAuth(data, botToken)) {
          console.error("[tg-auth] FAIL: HMAC verification failed");
          return null;
        }
        const authDate = parseInt(data.auth_date, 10);
        if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) {
          console.error("[tg-auth] FAIL: auth_date stale or missing:", data.auth_date);
          return null;
        }
        console.error("[tg-auth] OK: signing in tg:" + data.id);
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
        const u = user as unknown as { id?: string };
        const t = token as unknown as Record<string, unknown>;
        if (u.id) {
          t.id = u.id;
          t.provider = u.id.startsWith("tg:") ? "telegram" : "google";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as unknown as Record<string, unknown>;
        const su = session.user as unknown as Record<string, unknown>;
        if (t.id) su.id = t.id;
        if (t.provider) su.provider = t.provider;
      }
      return session;
    },
  },
});
