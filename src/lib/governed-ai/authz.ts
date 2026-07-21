import { getServerSession } from "next-auth"
import type { PrismaClient } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { governedRoleSchema, type GovernedRoleName } from "./contracts"
import { GovernedError } from "./errors"

export interface GovernedActor {
  userId: string
  agencyId: string
  role: GovernedRoleName
}

function memberRole(value: string): GovernedRoleName {
  const parsed = governedRoleSchema.safeParse(value.toUpperCase())
  if (!parsed.success) throw new GovernedError("ROLE_INVALID", "The tenant membership role is not supported.", 403)
  return parsed.data
}

export async function requireActor(prisma: PrismaClient): Promise<GovernedActor> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new GovernedError("AUTH_REQUIRED", "Authentication is required.", 401)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { agency: true, agencyMember: true },
  })
  if (!user || user.disabledAt) throw new GovernedError("SESSION_REVOKED", "The session is no longer authorized.", 401)
  if (user.agency) return { userId: user.id, agencyId: user.agency.id, role: "OWNER" }
  if (!user.agencyMember) throw new GovernedError("TENANT_REQUIRED", "A tenant membership is required.", 403)
  return { userId: user.id, agencyId: user.agencyMember.agencyId, role: memberRole(user.agencyMember.role) }
}

const rank: Record<GovernedRoleName, number> = { VIEWER: 0, CONTRIBUTOR: 1, REVIEWER: 2, OWNER: 3 }

export function requireRole(actor: GovernedActor, minimum: GovernedRoleName) {
  if (rank[actor.role] < rank[minimum]) throw new GovernedError("ROLE_FORBIDDEN", `${minimum} access is required.`, 403)
}
