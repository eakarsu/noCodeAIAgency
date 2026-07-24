import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import prisma from "@/lib/db"

const issuer = "no-code-ai-agency-runtime"
const audience = "runtime-acceptance"

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET || ""
  if (value.length < 32) throw new Error("NEXTAUTH_SECRET must contain at least 32 characters")
  return value
}

function digest(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createRuntimeSession(user: { id: string; email: string; sessionVersion: number }) {
  const token = jwt.sign(
    { email: user.email, sessionVersion: user.sessionVersion },
    secret(),
    { algorithm: "HS256", subject: user.id, issuer, audience, expiresIn: "24h" },
  )
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "RUNTIME_SESSION_CREATED",
      entityType: "RuntimeSession",
      entityId: digest(token),
      metadata: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
    },
  })
  return token
}

export async function runtimeActor(request: Request) {
  const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (!token) return null
  try {
    const claims = jwt.verify(token, secret(), { algorithms: ["HS256"], issuer, audience })
    if (typeof claims === "string" || typeof claims.sub !== "string") return null
    const [session, user] = await Promise.all([
      prisma.activityLog.findFirst({
        where: { action: "RUNTIME_SESSION_CREATED", entityType: "RuntimeSession", entityId: digest(token), userId: claims.sub },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { id: claims.sub, disabledAt: null },
        include: { agency: { select: { id: true } }, agencyMember: { select: { agencyId: true } } },
      }),
    ])
    if (!session || !user || user.sessionVersion !== Number(claims.sessionVersion)) return null
    return { ...user, agencyId: user.agency?.id || user.agencyMember?.agencyId || null }
  } catch {
    return null
  }
}
