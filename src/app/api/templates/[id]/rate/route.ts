import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { z } from "zod"

const rateSchema = z.object({
  rating: z.number().min(1).max(5).int(),
  review: z.string().max(1000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = rateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (!template.isPublic) {
      return NextResponse.json({ error: "Template not accessible" }, { status: 403 })
    }

    // Upsert rating
    const rating = await prisma.templateRating.upsert({
      where: {
        userId_templateId: {
          userId: session.user.id,
          templateId: id,
        },
      },
      update: {
        rating: parsed.data.rating,
        review: parsed.data.review,
      },
      create: {
        userId: session.user.id,
        templateId: id,
        rating: parsed.data.rating,
        review: parsed.data.review,
      },
    })

    // Recalculate average rating
    const aggregation = await prisma.templateRating.aggregate({
      where: { templateId: id },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.template.update({
      where: { id },
      data: { rating: aggregation._avg.rating || 0 },
    })

    return NextResponse.json({
      rating: {
        id: rating.id,
        rating: rating.rating,
        review: rating.review,
      },
      templateRating: aggregation._avg.rating || 0,
      totalRatings: aggregation._count.rating,
    })
  } catch (error) {
    console.error("Rate template error:", error)
    return NextResponse.json(
      { error: "Failed to rate template" },
      { status: 500 }
    )
  }
}
