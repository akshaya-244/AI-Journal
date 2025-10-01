import NextAuth from 'next-auth'
import GoogleProviders from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProviders({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Automatically create user in your database when they sign in
      if (account?.provider === 'google' && user) {
        try {
          const backendUrl = "https://ai-journal-api.akshayamohan-2401.workers.dev/"
          
          await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id || user.email,
              email: user.email,
              name: user.name,
              picture: user.image,
            }),
          })
        } catch (error) {
          console.error('Failed to create user in database:', error)
          // Don't block sign-in if database creation fails
        }
      }
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