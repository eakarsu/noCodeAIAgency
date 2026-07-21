import { cpSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const standalone = join(".next", "standalone")
if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("Standalone server output is missing; Next.js build did not complete.")
}

mkdirSync(join(standalone, ".next"), { recursive: true })
cpSync(join(".next", "static"), join(standalone, ".next", "static"), { recursive: true, force: true })
if (existsSync("public")) cpSync("public", join(standalone, "public"), { recursive: true, force: true })
console.log("Prepared standalone server with static and public assets.")
