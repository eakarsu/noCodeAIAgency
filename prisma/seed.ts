import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DISCARDABLE_SEED !== "I_ACKNOWLEDGE_DISCARDABLE_LOCAL_DATA") {
    throw new Error("Seed is restricted to explicitly acknowledged, disposable non-production databases.")
  }
  const databaseUrl = new URL(process.env.DATABASE_URL || "")
  if (!["127.0.0.1", "localhost", "::1"].includes(databaseUrl.hostname)) {
    throw new Error("Seed refuses non-loopback database hosts.")
  }
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_OWNER_PASSWORD || ""
  const agencyName = process.env.SEED_AGENCY_NAME?.trim()
  if (!email || !email.includes("@") || password.length < 16 || !agencyName) {
    throw new Error("SEED_OWNER_EMAIL, a 16+ character SEED_OWNER_PASSWORD, and SEED_AGENCY_NAME are required.")
  }
  const existing = await prisma.user.count()
  if (existing !== 0) throw new Error("Seed refuses a database that already contains users.")
  const slug = `local-${Date.now()}`
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      name: "Local Owner",
      role: "AGENCY_OWNER",
      agency: { create: { name: agencyName, slug } },
    },
  })
  console.log("Created one disposable local owner and tenant without demo credentials.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.")
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
