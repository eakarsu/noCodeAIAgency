import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            agency: true,
            agencyMember: {
              include: { agency: true },
            },
          },
        })

        if (!user) {
          throw new Error("Invalid email or password")
        }

        if (user.disabledAt) {
          throw new Error("Invalid email or password")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        const agencyId = user.agency?.id || user.agencyMember?.agencyId

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: agencyId || null,
          sessionVersion: user.sessionVersion,
          image: user.avatar,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.agencyId = user.agencyId
        token.sessionVersion = user.sessionVersion
        token.authInvalid = false
      } else if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          include: { agency: true, agencyMember: true },
        })
        if (!current || current.disabledAt || current.sessionVersion !== token.sessionVersion) {
          token.authInvalid = true
        } else {
          token.authInvalid = false
          token.role = current.role
          token.agencyId = current.agency?.id || current.agencyMember?.agencyId || null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.agencyId = token.agencyId as string | null
        session.user.authInvalid = Boolean(token.authInvalid)
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
