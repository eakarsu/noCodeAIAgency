import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const rollbackSchema = z.object({
  targetVersionId: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = rollbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Load current workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id, agencyId: session.user.agencyId },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Load target version
    const targetVersion = await prisma.workflowVersion.findUnique({
      where: { id: parsed.data.targetVersionId, workflowId: id },
    })

    if (!targetVersion) {
      return NextResponse.json({ error: "Target version not found" }, { status: 404 })
    }

    // Snapshot current state as a new version (preserves history)
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: workflow.version,
        nodes: workflow.nodes as Prisma.InputJsonValue,
        edges: workflow.edges as Prisma.InputJsonValue,
        variables: workflow.variables as Prisma.InputJsonValue,
        changelog: `State before rollback to ${targetVersion.version}`,
      },
    })

    // Compute new version number (increment patch)
    const newVersion = incrementPatchVersion(workflow.version)

    // Update workflow with target version's content
    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        nodes: targetVersion.nodes as Prisma.InputJsonValue,
        edges: targetVersion.edges as Prisma.InputJsonValue,
        variables: targetVersion.variables as Prisma.InputJsonValue,
        version: newVersion,
      },
    })

    // Create a version record for the rollback
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: newVersion,
        nodes: targetVersion.nodes as Prisma.InputJsonValue,
        edges: targetVersion.edges as Prisma.InputJsonValue,
        variables: targetVersion.variables as Prisma.InputJsonValue,
        changelog: `Rolled back to version ${targetVersion.version}`,
      },
    })

    return NextResponse.json({
      success: true,
      workflow: {
        id: updated.id,
        version: updated.version,
        rolledBackFrom: workflow.version,
        rolledBackTo: targetVersion.version,
      },
    })
  } catch (error) {
    console.error("Rollback error:", error)
    return NextResponse.json(
      { error: "Failed to rollback workflow" },
      { status: 500 }
    )
  }
}

function incrementPatchVersion(version: string): string {
  const parts = version.split(".")
  if (parts.length !== 3) return "1.0.1"

  const [major, minor, patch] = parts.map(Number)
  return `${major}.${minor}.${patch + 1}`
}
