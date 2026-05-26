import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'SMS OMA',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const user = credentials?.username
        const pass = credentials?.password
        if (
          user === process.env.APP_USERNAME &&
          pass === process.env.APP_PASSWORD
        ) {
          return { id: '1', name: 'SMS OMA', email: 'sms@satena.com' }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
})
