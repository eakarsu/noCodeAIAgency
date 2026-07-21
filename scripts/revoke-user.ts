import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  if (process.env.ADMIN_OPERATION_ACK !== "I_ACKNOWLEDGE_SESSION_REVOCATION") throw new Error("Session revocation was not acknowledged.")
  const email = process.env.REVOKE_USER_EMAIL?.trim().toLowerCase()
  if (!email) throw new Error("REVOKE_USER_EMAIL is required.")
  const user = await prisma.user.update({
    where: { email },
    data: { disabledAt: new Date(), sessionVersion: { increment: 1 } },
    select: { id: true },
  })
  console.log(`Revoked user ${user.id}.`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Revocation failed."); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
