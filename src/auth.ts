import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

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
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        const u = user as unknown as { id?: string; name?: string; email?: string; image?: string };
        const t = token as unknown as Record<string, unknown>;
        if (u.id) {
          t.id = u.id;
          t.provider = "google";
        }
        // Phase 4B: upsert user into SQLite. Use dynamic import so client bundles
        // don't pull in better-sqlite3.
        try {
          const providerUserId = account?.providerAccountId || u.email || u.id || "";
          if (providerUserId) {
            const { upsertUser } = await import("@/lib/db");
            const dbUser = upsertUser({
              provider: "google",
              providerUserId,
              email: u.email ?? null,
              name:
                u.name ??
                (profile && typeof profile === "object" && "name" in profile
                  ? (profile as { name?: string }).name ?? null
                  : null),
              avatarUrl: u.image ?? null,
            });
            t.dbUserId = dbUser.id;
          }
        } catch (e) {
          console.error("[auth] upsertUser failed:", e);
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
        if (t.dbUserId) su.dbUserId = t.dbUserId; // Phase 4B: server-side user UUID
      }
      return session;
    },
  },
});
