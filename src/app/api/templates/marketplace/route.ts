import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category")
    const industry = searchParams.get("industry")
    const sortBy = searchParams.get("sortBy") || "downloads"
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "12")

    const where: Record<string, unknown> = {
      isPublic: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search.toLowerCase()] } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (industry) {
      where.industry = industry
    }

    const orderBy: Record<string, string> = {}
    switch (sortBy) {
      case "downloads":
        orderBy.downloads = "desc"
        break
      case "rating":
        orderBy.rating = "desc"
        break
      case "newest":
        orderBy.createdAt = "desc"
        break
      case "name":
        orderBy.name = "asc"
        break
      default:
        orderBy.downloads = "desc"
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          category: true,
          industry: true,
          thumbnail: true,
          tags: true,
          isBuiltIn: true,
          version: true,
          downloads: true,
          rating: true,
          createdAt: true,
          _count: { select: { ratings: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.template.count({ where }),
    ])

    // Get unique categories and industries for filters
    const categories = await prisma.template.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ["category"],
    })

    const industries = await prisma.template.findMany({
      where: { isPublic: true, industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
    })

    return NextResponse.json({
      templates: templates.map(t => ({
        ...t,
        ratingCount: t._count.ratings,
        _count: undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters: {
        categories: categories.map(c => c.category),
        industries: industries.map(i => i.industry).filter(Boolean),
      },
    })
  } catch (error) {
    console.error("Marketplace fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch marketplace templates" },
      { status: 500 }
    )
  }
}
