import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Note: NextAuth may have compatibility issues with Edge Runtime on Cloudflare Pages
// If you encounter issues, consider using Node.js runtime instead
export const runtime = 'nodejs';        // required by Cloudflare Pages
export const dynamic = 'force-dynamic';

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn() {
      return true
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.sub && session.user) {
        (session.user as { id?: string }).id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }