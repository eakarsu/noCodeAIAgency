import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  if (
    process.env.BOOTSTRAP_OWNER_ACK !== "I_ACKNOWLEDGE_ONE_TIME_OWNER_CREATION" &&
    process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== "create-initial-admin"
  ) throw new Error("One-time owner creation was not acknowledged.")
  const email = (process.env.BOOTSTRAP_OWNER_EMAIL || process.env.ADMIN_EMAIL)?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD || process.env.ADMIN_PASSWORD || ""
  const name = (process.env.BOOTSTRAP_OWNER_NAME || process.env.BOOTSTRAP_ADMIN_NAME)?.trim()
  const agencyName = (process.env.BOOTSTRAP_AGENCY_NAME || process.env.BOOTSTRAP_TENANT_NAME)?.trim()
  const agencySlug = (process.env.BOOTSTRAP_AGENCY_SLUG || process.env.BOOTSTRAP_TENANT_SLUG)?.trim()
  if (!email || !email.includes("@") || password.length < 16 || !name || !agencyName || !agencySlug || !/^[a-z0-9-]{3,80}$/.test(agencySlug)) {
    throw new Error("Valid owner email/name, agency name/slug, and a 16+ character password are required.")
  }
  const [users, agencies] = await Promise.all([prisma.user.count(), prisma.agency.count()])
  if (users || agencies) throw new Error("Bootstrap refuses a database that already contains users or agencies.")
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 12),
      role: "AGENCY_OWNER",
      agency: { create: { name: agencyName, slug: agencySlug } },
    },
  })
  console.log(`Created initial owner ${user.id}.`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Bootstrap failed."); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
