import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import { requireActor } from "@/lib/governed-ai/authz"
import GovernedConsole from "./GovernedConsole"

export const dynamic = "force-dynamic"

export default async function GovernedPage() {
  let actor
  try {
    actor = await requireActor(prisma)
  } catch {
    redirect("/login")
  }
  return <GovernedConsole actor={actor} />
}
