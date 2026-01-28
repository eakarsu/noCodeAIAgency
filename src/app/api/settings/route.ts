import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
})

const agencySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  timezone: z.string().optional(),
  industry: z.string().optional(),
  teamSize: z.string().optional(),
})

const securitySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const notificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
})

// GET - Fetch user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        agency: {
          include: {
            brandSettings: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
      agency: user.agency ? {
        id: user.agency.id,
        name: user.agency.name,
        slug: user.agency.slug,
      } : null,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    switch (type) {
      case "profile": {
        const validated = profileSchema.parse(data)
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: validated,
        })
        return NextResponse.json({ success: true, data: updatedUser })
      }

      case "agency": {
        if (!user.agency) {
          return NextResponse.json({ error: "No agency found" }, { status: 404 })
        }
        const validated = agencySchema.parse(data)
        const updatedAgency = await prisma.agency.update({
          where: { id: user.agency.id },
          data: {
            name: validated.name,
            slug: validated.slug,
          },
        })
        return NextResponse.json({ success: true, data: updatedAgency })
      }

      case "security": {
        const validated = securitySchema.parse(data)

        // Verify current password
        const isValid = await bcrypt.compare(validated.currentPassword, user.password)
        if (!isValid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(validated.newPassword, 12)
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })

        return NextResponse.json({ success: true, message: "Password updated successfully" })
      }

      case "notifications": {
        const validated = notificationsSchema.parse(data)
        // Store in brand settings or create a separate user preferences table
        // For now, we'll acknowledge the save
        return NextResponse.json({ success: true, data: validated })
      }

      default:
        return NextResponse.json({ error: "Invalid settings type" }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
