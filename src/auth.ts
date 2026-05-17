import NextAuth from "next-auth";
import Authentik from "next-auth/providers/authentik";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Authentik({
      clientId: process.env.AUTHENTIK_ID!,
      clientSecret: process.env.AUTHENTIK_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
    }),
  ],
  trustHost: true, // required behind Cloudflare Tunnel
  pages: {
    signIn: "/api/auth/signin",
  },
  callbacks: {
    async session({ session, token }) {
      // Pass user id from token into session
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
