import { ObjectId } from "mongodb"
import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name?: string
    image?: string
  }

  interface Session {
    user?: User
    accessToken?: string
    refreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
  }
}
