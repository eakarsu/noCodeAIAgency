import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { generateSlug } from "@/lib/utils"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agencyName: z.string().min(2, "Agency name must be at least 2 characters"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Generate unique agency slug
    let slug = generateSlug(validated.agencyName)
    const existingAgency = await prisma.agency.findUnique({
      where: { slug },
    })
    if (existingAgency) {
      slug = `${slug}-${Date.now()}`
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password)

    // Create user and agency in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validated.name,
          email: validated.email,
          password: hashedPassword,
          role: "AGENCY_OWNER",
        },
      })

      const agency = await tx.agency.create({
        data: {
          name: validated.agencyName,
          slug,
          ownerId: user.id,
          brandSettings: {
            create: {
              primaryColor: "#3B82F6",
              secondaryColor: "#10B981",
              accentColor: "#8B5CF6",
            },
          },
        },
      })

      return { user, agency }
    })

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        agency: {
          id: result.agency.id,
          name: result.agency.name,
          slug: result.agency.slug,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error registering user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
