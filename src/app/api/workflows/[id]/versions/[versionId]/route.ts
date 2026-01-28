import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, versionId } = await params

    // Verify workflow belongs to agency
    const workflow = await prisma.workflow.findUnique({
      where: { id, agencyId: session.user.agencyId },
      select: { id: true },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const version = await prisma.workflowVersion.findUnique({
      where: { id: versionId, workflowId: id },
    })

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error("Version fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch version" },
      { status: 500 }
    )
  }
}
