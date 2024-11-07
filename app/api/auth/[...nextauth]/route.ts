import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import clientPromise from "../../../../lib/mongodb"
import { ObjectId } from "mongodb"

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const client = await clientPromise
        const db = client.db()
        
        const existingUser = await db.collection('users').findOne({ 
          email: user.email 
        })

        if (!existingUser) {
          await db.collection('users').insertOne({
            _id: new ObjectId(),
            email: user.email,
            name: user.name,
            image: user.image,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        } else {
          await db.collection('users').updateOne(
            { email: user.email },
            { 
              $set: { 
                lastLogin: new Date(),
                updatedAt: new Date()
              } 
            }
          )
        }
        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user = {
        ...session.user,
        id: token.sub,
        accessToken: token.accessToken as string,
      };
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
}

export const GET = NextAuth(authOptions)
export const POST = NextAuth(authOptions)
