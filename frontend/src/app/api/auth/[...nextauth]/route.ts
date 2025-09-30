import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
export const runtime = 'edge';        // required by Cloudflare Pages
export const dynamic = 'force-dynamic';
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return true
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.sub && session.user) {
        (session.user as { id?: string }).id = token.sub
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
