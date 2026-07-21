import { hostname } from "node:os"
import prisma from "../src/lib/db"
import { OpenRouterRecommendationProvider } from "../src/lib/governed-ai/provider"
import { processNextRecommendation } from "../src/lib/governed-ai/service"

async function main() {
  if (process.env.NODE_ENV !== "production" && process.env.GOVERNED_ALLOW_NONPROD_WORKER !== "I_ACKNOWLEDGE_NONPRODUCTION_ONLY") {
    throw new Error("Refusing to run the worker outside production without the non-production acknowledgement.")
  }
  const workerId = process.env.GOVERNED_WORKER_ID || `${hostname()}:${process.pid}`
  const once = process.argv.includes("--once")
  const provider = new OpenRouterRecommendationProvider()
  do {
    const job = await processNextRecommendation(prisma, provider, workerId)
    if (job) console.log(JSON.stringify({ jobId: job.id, status: job.status, attemptCount: job.attemptCount }))
    if (once) break
    await new Promise((resolve) => setTimeout(resolve, job ? 250 : 2_000))
  } while (true)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Governed worker failed.")
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
