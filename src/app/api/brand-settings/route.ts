import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const brandSettingsSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  companyName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  customCss: z.string().optional(),
  emailHeaderLogo: z.string().optional(),
  emailFooterText: z.string().optional(),
  emailSignature: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const brandSettings = await prisma.brandSettings.findUnique({
      where: { agencyId: session.user.agencyId },
    })

    if (!brandSettings) {
      // Return default settings
      return NextResponse.json({
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
        accentColor: "#8B5CF6",
        logo: null,
        favicon: null,
        companyName: null,
        supportEmail: null,
        customCss: null,
        emailHeaderLogo: null,
        emailFooterText: null,
        emailSignature: null,
      })
    }

    return NextResponse.json(brandSettings)
  } catch (error) {
    console.error("Error fetching brand settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = brandSettingsSchema.parse(body)

    const brandSettings = await prisma.brandSettings.upsert({
      where: { agencyId: session.user.agencyId },
      update: validated,
      create: {
        ...validated,
        agencyId: session.user.agencyId,
      },
    })

    return NextResponse.json(brandSettings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating brand settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
